from dotenv import load_dotenv
import os
import time
import re
import argparse
from collections import defaultdict

from datetime import datetime

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException
import tempfile

driver = None
wait = None

from pymongo import MongoClient

from rapidfuzz import fuzz

SIMILARITY_THRESHOLD = 90  # adjust as needed (90 is a good start)
season_start = datetime(2025, 1, 6)  # first week of season start (Monday)

def click_leaderboard(tournament_element):
  # Get all buttons inside this tournament
  leaderboard_btn = tournament_element.find_element(By.CLASS_NAME, "leaderboard_button")
  try:
    leaderboard_btn.click()  
    wait.until(EC.presence_of_element_located((By.XPATH, '//tr[@data-uid]')))
  except Exception as e: 
    raise Exception(f"Could not find leaderboard button for {e}")

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

def scrape_leaderboards(tournament_metadata, tourney_type, open_url, closed_url):
  tournament_docs = []

  # Iterate over Stonehenge and Tour events
  for base_title, tournament_list in tournament_metadata.items():
    player_scores = {}

    for meta in tournament_list:
      index = meta["index"]

      # Refresh the DOM elements
      if tourney_type == "open":
        driver.get(open_url)
        wait.until(EC.presence_of_element_located((By.CLASS_NAME, "open_tournament")))
        tournaments = driver.find_elements(By.CLASS_NAME, "open_tournament")
      else:
        driver.get(closed_url)
        range_button = driver.find_element(By.ID, "date_range_Past30Days")
        range_button.click()
        # wait.until(EC.presence_of_element_located((By.CLASS_NAME, "closed_tournament")))
        time.sleep(1)
        tournaments = driver.find_elements(By.CLASS_NAME, "closed_tournament")

      if index >= len(tournaments):
        print(f"[SKIP] Tournament at index {index} not found after reload")
        continue

      tourney = tournaments[index]

      if tourney_type == "open":
        # Get the end date
        end_date_str = tourney.find_element(By.CLASS_NAME, "ends_in_value").text.strip()
      else:
        # Get the closed date
        end_date_str = tourney.find_element(By.CLASS_NAME, "closed_value").text.strip()

      # Parse to datetime
      end_dt = datetime.strptime(end_date_str, "%Y-%m-%d %H:%M")

      # Format to just date
      end_date = end_dt.date().isoformat()

      # Get the leaderboard button element
      try:
        leaderboard_btn = tourney.find_element(By.CLASS_NAME, "leaderboard_button")
      except:
        print(f"[SKIP] No leaderboard available for: {meta['full_title']}")
        continue  # skip to the next tournament

      # Click the leaderboard button
      click_leaderboard(tourney)
      
      rows = driver.find_elements(By.XPATH, '//table//tr[@data-uid]')

      if "C2C Tour" in meta["full_title"]:
        for row in rows:
          cells = row.find_elements(By.TAG_NAME, 'td')
          name = cells[1].text

          if name not in player_scores:
            player_scores[name] = {"name": name}

          if tourney_type == "open":
            score = cells[4].text
          else:
            score = cells[5].text

          if "F9" in meta["full_title"]:
            player_scores[name]["F9"] = score
          elif "B9" in meta["full_title"]:
            player_scores[name]["B9"] = score
          elif "F18" in meta["full_title"]:
            player_scores[name]["F18"] = score
          else:
            print(f"Could not identify card type of {meta['full_title']}")
            continue
      else:
        for row in rows:
          cells = row.find_elements(By.TAG_NAME, 'td')
          name = cells[1].text

          if name not in player_scores:
            player_scores[name] = {"name": name}

          if tourney_type == "open":
            scores = [cells[3].text, cells[4].text, cells[5].text, cells[6].text]
          else: 
            scores = [cells[4].text, cells[5].text, cells[6].text, cells[7].text]

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

      tournament_docs.append({
        "tourney_id": f"{month} - {birthstone}",
        "type": "Stonehenge",
        "end_date": end_date,
        "players": list(player_scores.values())
      })

  return tournament_docs

def main():
  parser = argparse.ArgumentParser(description="Scrape tournaments from site.")
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

  chrome_options = Options()

  # Create a temporary profile directory
  temp_profile = tempfile.mkdtemp()
  chrome_options.add_argument(f"--user-data-dir={temp_profile}")
  chrome_options.add_argument("--no-sandbox")
  chrome_options.add_argument("--disable-dev-shm-usage")
  # chrome_options.add_argument("--headless=new")  # optional: run without GUI
  # options.add_argument("--disable-gpu")           # uncomment these 3 lines when running headless
  # options.add_argument("--window-size=1920,1080")

  global driver
  global wait

  driver = webdriver.Chrome(options=chrome_options)
  driver.get(LOGIN_PAGE)  # page with sign in button

  wait = WebDriverWait(driver, 10)
  wait.until(lambda d: d.execute_script('return document.readyState') == 'complete')

  # Connect to your MongoDB instance
  client = MongoClient(mongo_uri)

  # Choose database and collection
  db = client["tournaments_db"]
  collection = db["leaderboards"]

  # 1. Fill username and password
  username_input = wait.until(EC.visibility_of_element_located((By.XPATH, '//*[@id="Username"]')))
  username_input.send_keys(username)

  password_input = wait.until(EC.visibility_of_element_located((By.XPATH, '//*[@id="Password"]')))
  password_input.send_keys(password)

  # 2. Submit the form (e.g., click login button inside the modal)
  # Dismiss the cookie banner
  try:
    cookie_accept_btn = WebDriverWait(driver, 5).until(
      EC.element_to_be_clickable((By.CLASS_NAME, "osano-cm-deny"))
    )
    cookie_accept_btn.click()
  except TimeoutException:
    print("No cookie banner appeared - continuing.")

  login_button = driver.find_element(By.ID, "LoginBtn")
  login_button.click()  

  time.sleep(1)

  # 3. Logged in and can proceed to scrape or navigate
  if (tourney_type == "open"):
    driver.get(OPEN_TOURNEY_PAGE)
    wait.until(EC.presence_of_element_located((By.CLASS_NAME, "open_tournament")))
    time.sleep(2) # Ensure that all tournaments load, not just a subset of them
    tournaments = driver.find_elements(By.CLASS_NAME, "open_tournament")
  else: 
    driver.get(CLOSED_TOURNEY_PAGE)
    wait.until(EC.presence_of_element_located((By.ID, "date_range_Past30Days")))
    range_button = driver.find_element(By.ID, "date_range_Past30Days")
    range_button.click()
    # wait.until(EC.presence_of_element_located((By.CLASS_NAME, "closed_tournament")))
    time.sleep(2) # Ensure that all tournaments load, not just a subset of them
    tournaments = driver.find_elements(By.CLASS_NAME, "closed_tournament")

  # Temporary dictionary to hold all scores of players by tournament and round
  player_scores = {}

  # Scrape all of the C2C Stonehenge and C2C Tour tournaments
  all_metadata = defaultdict(list)

  for idx in range(len(tournaments)):
    # Get all the tournaments (again), make sure driver is not stale
    if tourney_type == "open":
      wait.until(EC.presence_of_element_located((By.CLASS_NAME, "open_tournament")))
      tournaments = driver.find_elements(By.CLASS_NAME, "open_tournament")
    else:
      wait.until(EC.presence_of_element_located((By.CLASS_NAME, "closed_tournament")))
      tournaments = driver.find_elements(By.CLASS_NAME, "closed_tournament")

    if idx >= len(tournaments):
      print(f"[WARN] Tournament at index {idx} disappeared after reload")
      continue

    try:
      # Wait for the title inside the specific tournament to be present
      tourney = tournaments[idx]
      title_elem = WebDriverWait(tourney, 5).until(
        lambda el: el.find_element(By.CLASS_NAME, "title")
      )
      full_title = title_elem.text
    except Exception as e:
      print(f"[SKIP] Tournament at index {idx} is stale or missing title: {e}")
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
        print(f"[GROUPED] {base_title} ≈ {matched_key}")
        all_metadata[matched_key].append({"index": idx, "full_title": full_title})
      else:
        print(f"[ADD] Index {idx} | Full Title: {full_title} → Base Title: {base_title}")
        all_metadata[base_title].append({"index": idx, "full_title": full_title})

  if len(all_metadata) != 0:
    tournament_docs = scrape_leaderboards(all_metadata, tourney_type, OPEN_TOURNEY_PAGE, CLOSED_TOURNEY_PAGE)
    for doc in tournament_docs:
      existing = collection.find_one({"tourney_id": doc["tourney_id"]})
      
      # If it's a closed Stonehenge tournament and already exists, preserve the original end_date
      # Due to a bug on the webstie which data is being scraped, we would like to preserve the old date instead
      if tourney_type == "closed" and doc["type"] == "Stonehenge" and existing:
        doc["end_date"] = existing["end_date"]

      collection.replace_one(
        {"tourney_id": doc["tourney_id"]},
        doc,
        upsert=True
      )

  input("Press Enter to exit and close the browser...")
  driver.quit()

if __name__ == "__main__":
  main()