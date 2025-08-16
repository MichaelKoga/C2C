import asyncio
import os
import re
import argparse
from datetime import datetime
from collections import defaultdict
from dotenv import load_dotenv
from pymongo import MongoClient
from rapidfuzz import fuzz
from playwright.async_api import async_playwright

SIMILARITY_THRESHOLD = 90
season_start = datetime(2025, 1, 6)

async def click_leaderboard(page, tournament_locator):
  leaderboard_btn = tournament_locator.locator(".leaderboard_button")
  await leaderboard_btn.click()
  await page.locator('//tr[@data-uid]').first.wait_for()

def get_week_number(base_title, end_date):
  # Parse out what week it is from the base title
  match = re.search(r"Week\s+\d+", base_title)
  if match:
    week = match.group()
    week_number = int(re.search(r"\d+", week).group())
  else:
    # Otherwise, calculate from the season start date
    if isinstance(end_date, str):
      end_date = datetime.strptime(end_date, "%Y-%m-%d")
    week_number = ((end_date - season_start).days // 7) + 1

  return week_number

async def scrape_leaderboards(page, tournament_metadata, tourney_type, open_url, closed_url):
  tournament_docs = []

  for base_title, tournament_list in tournament_metadata.items():
    player_scores = {}

    for meta in tournament_list:
      index = meta["index"]

      if tourney_type == "open":
        await page.goto(open_url)
        tournaments = page.locator(".open_tournament")
      else:
        await page.goto(closed_url)
        page.locator("#date_range_Past30Days").click()
        tournaments = page.locator(".closed_tournament")

      count = await tournaments.count()
      if index >= count:
        print(f"[SKIP] Tournament at index {index} not found after reload")
        continue

      tourney = tournaments.nth(index)

      print("Tournament name: ", await tourney.locator(".title").inner_text())
      if tourney_type == "open":
        # Get the end date
        end_date_str = await tourney.locator(".ends_in_value").nth(0).inner_text()
      else:
        # Get the closed date
        end_date_str = await tourney.locator(".closed_value").nth(0).inner_text()

      # Parse to datetime
      end_dt = datetime.strptime(end_date_str.strip(), "%Y-%m-%d %H:%M")

      # Format to just date
      end_date = end_dt.date().isoformat()

      # Click leaderboard
      await click_leaderboard(page, tourney)

      rows = page.locator('//table//tr[@data-uid]')
      row_count = await rows.count()
      
      if "C2C Tour" in meta["full_title"]: 
        for i in range(row_count):
          row = rows.nth(i)
          cells = row.locator("td")
          name = (await cells.nth(1).inner_text()).strip()
          if name not in player_scores:
            player_scores[name] = {"name": name}

          if tourney_type == "open":
            score = await cells.nth(4).inner_text()
          else:
            score = await cells.nth(5).inner_text()

          if "F9" in meta["full_title"]:
            player_scores[name]["F9"] = score
          elif "B9" in meta["full_title"]:
            player_scores[name]["B9"] = score
          elif "F18" in meta["full_title"]:
            player_scores[name]["F18"] = score
          else:
            print(f"Could not identify card type of {meta['full_title']}")

      else:
        for i in range(row_count):
          row = rows.nth(i)
          cells = row.locator("td")
          name = (await cells.nth(1).inner_text()).strip()

          if name not in player_scores:
            player_scores[name] = {"name": name}
          
          if tourney_type == "open":
            R1 = await cells.nth(3).inner_text()
            R2 = await cells.nth(4).inner_text()
            R3 = await cells.nth(5).inner_text()
            R4 = await cells.nth(6).inner_text()
            scores = [R1, R2, R3, R4]
          else:
            R1 = await cells.nth(4).inner_text()
            R2 = await cells.nth(5).inner_text()
            R3 = await cells.nth(6).inner_text()
            R4 = await cells.nth(7).inner_text()
            scores = [R1, R2, R3, R4]
          
          if "F9" in meta["full_title"]:
            player_scores[name]["F9"] = scores
          elif "B9" in meta["full_title"]:
            player_scores[name]["B9"] = scores
          elif "F18" in meta["full_title"]:
            player_scores[name]["F18"] = scores
          else:
            print(f"Could not identify card type of {meta['full_title']}")
            continue

    if "C2C Tour" in base_title:
      week_number = get_week_number(base_title, end_date)

      # Parse out what the tourney name is
      parts = base_title.split("-")

      if len(parts) >= 3:
        tourney_name_with_round = parts[2].strip()
        # Remove the round info in parentheses, e.g., "(F9)"
        tourney_name = re.sub(r"\s*\((?:F9|B9|F18)\)", "", tourney_name_with_round).strip()
      else:
        tourney_name_with_round = parts[1].strip()
        # Remove the round info in parentheses, e.g., "(F9)"
        tourney_name = re.sub(r"\s*\((?:F9|B9|F18)\)", "", tourney_name_with_round).strip()

      print(player_scores)

      tournament_docs.append({
        "tourney_id": f"Wk {week_number} - {tourney_name}",
        "type": "Tour",
        "end_date": end_date,
        "players": list(player_scores.values())
      })
    else:
      # Parse out what month it is
      match_month = re.search(r"\b(January|February|March|April|May|June|July|August|September|October|November|December)\b", base_title, re.I)
      if match_month:
        month = match_month.group()

      match_birthstone = re.search(r"\b(Garnet|Amethyst|Aquamarine|Diamond|Emerald|Pearl|Ruby|Peridot|Sapphire|Opal|Topaz|Turquoise)\b", base_title, re.I)
      if match_birthstone:
        birthstone = match_birthstone.group()

      print(player_scores)

      tournament_docs.append({
        "tourney_id": f"{month} - {birthstone}",
        "type": "Stonehenge",
        "end_date": end_date,
        "players": list(player_scores.values())
      })

  return tournament_docs

async def main():
  parser = argparse.ArgumentParser()
  parser.add_argument("--tourney-type", choices=["open", "closed"], default="open",
                      help="Specify which type of tournament to scrape: open or closed")
  args = parser.parse_args()
  tourney_type = args.tourney_type

  load_dotenv()
  username = os.getenv("MY_USERNAME")
  password = os.getenv("MY_PASSWORD")
  mongo_uri = os.getenv("MONGO_URI")
  LOGIN_PAGE = os.getenv("LOGIN")
  OPEN_TOURNEY_PAGE = os.getenv("OPEN_TOURNEY_PAGE")
  CLOSED_TOURNEY_PAGE = os.getenv("CLOSED_TOURNEY_PAGE")

  # Connect to your MongoDB instance
  client = MongoClient(mongo_uri)

  # Choosed your database and collection
  db = client["tournaments_db"]
  collection = db["leaderboards"]

  async with async_playwright() as p:
    browser = await p.chromium.launch(headless=False)  # set True on server
    page = await browser.new_page()
    await page.goto(LOGIN_PAGE)

    await page.fill('#Username', username)
    await page.fill('#Password', password)

    try:
      await page.locator(".osano-cm-deny").click(timeout=3000)
    except:
      pass

    await page.click("#LoginBtn")

    if tourney_type == "open":
      await page.goto(OPEN_TOURNEY_PAGE)
      tournaments = page.locator(".open_tournament")
    else:
      await page.goto(CLOSED_TOURNEY_PAGE)
      await page.click("#date_range_Past30Days")
      tournaments = page.locator(".closed_tournament")

    all_metadata = defaultdict(list)

    count = await tournaments.count()

    for idx in range(count):
      tourney = tournaments.nth(idx)
      full_title = await tourney.locator(".title").inner_text()
      if "C2C Stonehenge" in full_title or "C2C Tour" in full_title:
        base_title = re.sub(r"\s*\((?:F9|B9|F18)\)", "", full_title).strip()
        
        # Attempt to find a similar existing base title
        matched_key = None
        for existing_key in all_metadata.keys():
          if fuzz.ratio(base_title, existing_key) >= SIMILARITY_THRESHOLD:
            matched_key = existing_key
            break
        if matched_key:
          print(f"[GROUPED] {base_title} ≈ {matched_key}")
          all_metadata[matched_key].append({"index": idx, "full_title": full_title})
        else:
          print(f"[ADD] Index {idx} | Full Title: {full_title} → Base Title: {base_title}")
          all_metadata[base_title].append({"index": idx, "full_title": full_title})

    if all_metadata:
      docs = await scrape_leaderboards(page, all_metadata, tourney_type, OPEN_TOURNEY_PAGE, CLOSED_TOURNEY_PAGE)
      for doc in docs:
        existing = collection.find_one({"tourney_id": doc["tourney_id"]})
        if tourney_type == "closed" and doc.get("type") == "Stonehenge" and existing:
          doc["end_date"] = existing["end_date"]
        
        collection.replace_one({"tourney_id": doc["tourney_id"]}, doc, upsert=True)

    await browser.close()

if __name__ == "__main__":
  asyncio.run(main())
