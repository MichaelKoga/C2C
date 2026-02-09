import asyncio
import os
import re
import argparse
import logging
from datetime import datetime
from collections import defaultdict
from dotenv import load_dotenv
from pymongo import MongoClient
from rapidfuzz import fuzz
from playwright.async_api import async_playwright

SIMILARITY_THRESHOLD = 90
season_start_2025 = datetime(2025, 1, 6)
season_start_2026 = datetime(2026, 1, 4)

logging.basicConfig(
  level=logging.INFO,
  format="%(asctime)s [%(levelname)s] %(message)s",
  datefmt="%Y-%m-%d %H:%M:%S"
)

# Define a mapping of possible month spellings → full month names
MONTH_MAP = {
  "jan": "January", "january": "January",
  "feb": "February", "february": "February",
  "mar": "March", "march": "March",
  "apr": "April", "april": "April",
  "may": "May",
  "jun": "June", "june": "June",
  "jul": "July", "july": "July",
  "aug": "August", "august": "August",
  "sep": "September", "sept": "September", "september": "September",
  "oct": "October", "october": "October",
  "nov": "November", "november": "November",
  "dec": "December", "december": "December",
}

# Garnet|Amethyst|Aquamarine|Diamond|Emerald|Pearl|Ruby|Peridot|Sapphire|Tourmaline|Topaz|Turquoise

BIRTHSTONE_TO_MONTH_2025 = {
    "Garnet": "January",
    "Amethyst": "February",
    "Aquamarine": "March",
    "Diamond": "April",
    "Emerald": "May",
    "Pearl": "June",
    "Ruby": "July",
    "Peridot": "August",
    "Sapphire": "September",
    "Tourmaline": "October",
    "Topaz": "November",
    "Blue Zircon": "December", 
}

MONTH_TO_BIRTHSTONE_2025 = {
    "January": "Garnet",
    "February": "Amethyst",
    "March": "Aquamarine",
    "April": "Diamond",
    "May": "Emerald",
    "June": "Pearl",
    "July": "Ruby",
    "August": "Peridot",
    "September": "Sapphire",
    "October": "Tourmaline",
    "November": "Topaz",
    "December": "Blue Zircon",
}

STONE_TO_MONTH_2026 = {
    "Ember Stone": "January",
    "Veil Stone": "February",
    "Tidal Stone": "March",
    "Prism Stone": "April",
    "Verdant Stone": "May",
    "Luster Stone": "June",
    "Blood Stone": "July",
    "Sunlit Stone": "August",
    "Deep Stone": "September",
    "Shifting Stone": "October",
    "Hearth Stone": "November",
    "Sky Stone": "December", 
}

MONTH_TO_STONE_2026 = {
    "January": "Ember Stone",
    "February": "Veil Stone",
    "March": "Tidal Stone",
    "April": "Prism Stone",
    "May": "Verdant Stone",
    "June": "Luster Stone",
    "July": "Blood Stone",
    "August": "Sunlit Stone",
    "September": "Deep Stone",
    "October": "Shifting Stone",
    "November": "Hearth Stone",
    "December": "Sky Stone",
}

async def click_leaderboard(page, tournament_locator):
  leaderboard_btn = tournament_locator.locator(".leaderboard_button")
  await leaderboard_btn.scroll_into_view_if_needed()
  await asyncio.sleep(1)
  await leaderboard_btn.click(force=True)
  await asyncio.sleep(2)
  # Wait for the leaderboard table to show up
  await page.locator("table.datatable.leaders").wait_for(state="visible", timeout=15000)

  # Then wait for at least one row with data-uid
  await page.locator("table.datatable.leaders tr[data-uid]").first.wait_for(state="attached", timeout=15000) 
    
def get_week_number(base_title, end_date):
  # Parse out what week it is from the base title
  match = re.search(r"Wk\s+\d+", base_title)
  if match:
    week = match.group()
    week_number = int(re.search(r"\d+", week).group())
  else:
    # Otherwise, calculate from the season start date
    if isinstance(end_date, str):
      end_date = datetime.strptime(end_date, "%Y-%m-%d")
      if end_date > season_start_2026:
        week_number = ((end_date - season_start_2026).days // 7) + 1
      elif end_date > season_start_2025:
        week_number = ((end_date - season_start_2025).days // 7) + 1

  return week_number

async def is_active_tournament(tourney):
  start_at = tourney.locator(".field.start_at")

  if await start_at.is_visible():
    return False
  
  return True

async def scrape_leaderboards(page, tournament_metadata, tourney_type, open_url, closed_url):
  tournament_docs = []

  for base_title, tournament_list in tournament_metadata.items():
    player_scores = {}

    for meta in tournament_list:
      index = meta["index"]

      if tourney_type == "open": 
        await page.goto(open_url)
        await page.wait_for_selector(".open_tournament", state="attached", timeout=20000)
        tournaments = page.locator(".open_tournament")
      else:
        await page.goto(closed_url)
        await page.click("#date_range_Past30Days")
        await page.wait_for_selector(".closed_tournament", state="attached", timeout=20000)
        await asyncio.sleep(1)
        tournaments = page.locator(".closed_tournament")

      count = await tournaments.count()
      if index >= count:
        logging.info(f"[SKIP] Tournament at index {index} not found after reload")
        continue

      tourney = tournaments.nth(index)

      title = await tourney.locator(".title").inner_text()
      logging.info(f"Scraping tournament: {title}")
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
      if await is_active_tournament(tourney):
        await click_leaderboard(page, tourney)
      else:
        logging.info(f"Tournament {title} is currently not active and can't be scraped...")
        break

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
            # use the holes type from the metadata
            if meta["holes"] == "Front 9":
              player_scores[name]["F9"] = score
            elif meta["holes"] == "Back 9":
              player_scores[name]["B9"] = score
            elif meta["holes"] == "Full 18":
              player_scores[name]["F18"] = score
            else:
              logging.error(f"Could not identify card type of {meta['full_title']}")
              continue

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
            # use the holes type from the metadata
            if meta["holes"] == "Front 9":
              player_scores[name]["F9"] = score
            elif meta["holes"] == "Back 9":
              player_scores[name]["B9"] = score
            elif meta["holes"] == "Full 18":
              player_scores[name]["F18"] = score
            else:
              logging.error(f"Could not identify card type of {meta['full_title']}")
              continue

    if "C2C Tour" in base_title:
      week_number = get_week_number(base_title, end_date)

      # Parse out what the tourney name is
      parts = base_title.split("-")

      print(f"Working on parsing details from {base_title}")

      if len(parts) >= 3:
        tourney_name_with_round = parts[2].strip()
        # Remove the round info in parentheses, e.g., "(F9)"
        tourney_name = re.sub(r"\s*\((?:F9|B9|F18)\)", "", tourney_name_with_round).strip()
      elif len(parts) == 2:
        tourney_name_with_round = parts[1].strip()
        # Remove the round info in parentheses, e.g., "(F9)"
        tourney_name = re.sub(r"\s*\((?:F9|B9|F18)\)", "", tourney_name_with_round).strip()
      else: 
        # Only one part, keep the whole name
        tourney_name = parts[0].strip()

      print(player_scores)

      if "Shootout" in base_title:
        tourney_name = re.sub(r"\bC2C\sTour\b", "", base_title).strip() # Strip C2C Tour from tourney name
        tourney_name = re.sub(r"\s*\((?:F9|B9|F18)\)", "", tourney_name)
        tournament_docs.append({
          "tourney_id": f"Wk {week_number} - {tourney_name}",
          "type": "Shootout",
          "end_date": end_date,
          "players": list(player_scores.values())
        })
      else:
        tournament_docs.append({
          "tourney_id": f"Wk {week_number} - {tourney_name}",
          "type": "Tour",
          "end_date": end_date,
          "players": list(player_scores.values())
        })
    else:
      # Stonehenge
      month = None
      stone = None
      # Parse out what month it is
      match_month = re.search(
        r"\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|"
        r"Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b",
        base_title,
        re.I
      )
      if match_month:
        raw_month = match_month.group()
        month = MONTH_MAP[raw_month.lower()]

      if end_dt > season_start_2026:
        match_stone = re.search(r"\b(Ember\sStone|Veil\sStone|Tidal\sStone|Prism\sStone|Verdant\sStone|Luster\sStone|Blood\sStone|Sunlit\sStone|Deep\sStone|Shifting\sStone|Hearth\sStone|Sky\sStone)\b", base_title, re.I)
        if match_stone:
          stone = match_stone.group()
      else:
        match_birthstone = re.search(r"\b(Garnet|Amethyst|Aquamarine|Diamond|Emerald|Pearl|Ruby|Peridot|Sapphire|Tourmaline|Topaz|Blue Zircon)\b", base_title, re.I)
        if match_birthstone:
          stone = match_birthstone.group()

      print(player_scores)

      tourney_id = None

      if month and stone:
        tourney_id = f"{month} - {stone}"
      elif month and not stone:
        if end_dt > season_start_2026:
          stone = MONTH_TO_STONE_2026[month]
        else:
          stone = MONTH_TO_BIRTHSTONE_2025[month]
        tourney_id = f"{month} - {stone}"
      elif not month and stone:
        if end_dt > season_start_2026:
          month = STONE_TO_MONTH_2026[stone]
        else:
          month = BIRTHSTONE_TO_MONTH_2025[stone]
        tourney_id = f"{month} - {stone}"
      else:
        print(f"Could not ID {meta['full_title']}: Missing month and birthstone information")

      if tourney_id is not None:
        tournament_docs.append({
          "tourney_id": tourney_id,
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
  client = MongoClient(mongo_uri)  # Choosed your database and collection
  db = client["tournaments_db"]
  collection = db["leaderboards"]

  # Make head-on for local, headless for remote
  HEADLESS = os.getenv("CI", "false").lower() == "true"

  async with async_playwright() as p:
    browser = await p.firefox.launch(
      headless=HEADLESS,             
      args=[
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--single-process",
        "--disable-gpu",
        "--disable-extensions"
      ] # required for Lambda
    )

    page = await browser.new_page()
    await page.goto(LOGIN_PAGE)
    logging.info("Landed on login page...")

    await page.fill('#Username', username)
    await page.fill('#Password', password)

    try:
      await page.locator(".osano-cm-deny").click(timeout=3000)
    except:
      pass

    await page.click("#LoginBtn")

    logging.info("Successful login!")

    if tourney_type == "open":
      await page.goto(OPEN_TOURNEY_PAGE)
      logging.info("Landed on tournament page!")
      await page.wait_for_load_state("domcontentloaded")
      tournaments = page.locator(".open_tournament")
    else:
      await page.goto(CLOSED_TOURNEY_PAGE)
      logging.info("Landed on tournament page!")
      await page.wait_for_load_state("domcontentloaded")
      await page.locator("#date_range_Past30Days").click(force=True)
      await page.wait_for_selector(".closed_tournament", state="attached", timeout=20000)
      await asyncio.sleep(1)
      tournaments = page.locator(".closed_tournament")

    all_metadata = defaultdict(list)

    count = await tournaments.count()

    logging.info(f"Found {count} total tournaments") 

    for idx in range(count):
      tourney = tournaments.nth(idx)
      full_title = await tourney.locator(".title").inner_text()
      logging.info(f"Tournament name: {full_title}")
      holes_value = await tourney.locator(".holes_value").first.inner_text() # Stonehenge would have 4, but they are all the same
      # Do not include CTTH (e.g. C2C Tour CTTH)
      if "CTTH" in full_title: 
        continue
      
      if "C2C Stonehenge" in full_title or "C2C Tour" in full_title:
        base_title = re.sub(r"\s*\((?:F9|B9|F18)\)", "", full_title).strip()
        
        # Attempt to find a similar existing base title
        matched_key = None
        for existing_key in all_metadata.keys():
          if fuzz.ratio(base_title, existing_key) >= SIMILARITY_THRESHOLD:
            matched_key = existing_key
            break
        if matched_key:
          logging.info(f"[GROUPED] {base_title} ≈ {matched_key}")
          all_metadata[matched_key].append({"index": idx, "holes": holes_value, "full_title": full_title})
        else:
          logging.info(f"[ADD] Index {idx} | Full Title: {full_title} → Base Title: {base_title}")
          all_metadata[base_title].append({"index": idx, "holes": holes_value, "full_title": full_title})

    if all_metadata:
      docs = await scrape_leaderboards(page, all_metadata, tourney_type, OPEN_TOURNEY_PAGE, CLOSED_TOURNEY_PAGE)
      for doc in docs:
        existing = collection.find_one({"tourney_id": doc["tourney_id"]})
        if tourney_type == "closed" and doc.get("type") == "Stonehenge" and existing:
          doc["end_date"] = existing["end_date"]
        
        collection.replace_one({"tourney_id": doc["tourney_id"]}, doc, upsert=True)

    logging.info("Successfully added scores to database!")
    await browser.close()

if __name__ == "__main__":
  asyncio.run(main())
