from dotenv import load_dotenv
import os
import time
import re

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

def click_leaderboard(tournament_element):
  # Get all buttons inside this tournament
  leaderboard_btn = tournament_element.find_element(By.CLASS_NAME, "leaderboard_button")
  try:
    leaderboard_btn.click()  
    wait.until(EC.presence_of_element_located((By.XPATH, '//tr[@data-uid]')))
  except Exception as e: 
    raise Exception(f"Could not find leaderboard button for {e}")

def scrape_leaderboards(tournament_metadata, tour_type):
  player_scores = {}

  for meta in tournament_metadata:
    index = meta["index"]

    # Refresh the DOM elements
    tournaments = driver.find_elements(By.CLASS_NAME, "open_tournament")

    if index >= len(tournaments):
      continue

    tourney = tournaments[index]

    title = tourney.find_element(By.CLASS_NAME, "title").text

    # Get the start date
    start_at_element = tourney.find_element(By.CLASS_NAME, "start_at")
    start_date_str = start_at_element.find_element(By.CLASS_NAME, "value").get_attribute("title")

    # Parse to datetime
    dt = datetime.strptime(start_date_str, "%Y-%m-%d %H:%M")

    # Format to just date
    start_date = dt.date().isoformat()

    # Get the leaderboard button element
    leaderboard_btn = tourney.find_element(By.CLASS_NAME, "leaderboard_button")

    # Click the leaderboard button
    click_leaderboard(tourney)
    
    rows = driver.find_elements(By.XPATH, '//table//tr[@data-uid]')

    if tour_type == "weekly":
      # Parse out what week it is
      match = re.search(r"Week\s+\d+", title)
      if match:
        week = match.group()
        week_number = int(re.search(r"\d+", week).group())

      # Parse out what the tourney name is
      parts = title.split("-")

      if len(parts) >= 3:
        tourney_name_with_round = parts[2].strip()
        # Remove the round info in parentheses, e.g., "(F9)"
        tourney_name = re.sub(r"\s*\(F9|B9|F18\)", "", tourney_name_with_round).strip()
    else:
      # Parse out what month it is
      match_month = re.search(r"\b(January|February|March|April|May|June|July|August|September|October|November|December)\b", title, re.I)
      if match_month:
        month = match_month.group()

      match_birthstone = re.search(r"\b(Garnet|Amethyst|Aquamarine|Diamond|Emerald|Pearl|Ruby|Peridot|Sapphire|Opal|Topaz|Turquoise)\b", title, re.I)
      if match_birthstone:
        birthstone = match_birthstone.group()

    for row in rows:
      cells = row.find_elements(By.TAG_NAME, 'td')
      name = cells[1].text

      if name not in player_scores:
        player_scores[name] = {"name": name}

      if tour_type == "weekly":
        score = cells[4].text

        if "F9" in title:
          player_scores[name]["F9"] = score
        elif "B9" in title:
          player_scores[name]["B9"] = score
        elif "F18" in title:
          player_scores[name]["F18"] = score
        else:
          print(f"Could not identify card type of {title}")
          continue
      else:
        scores = [cells[3].text, cells[4].text, cells[5].text, cells[6].text]

        if "F9" in title:
          player_scores[name]["F9"] = scores
        elif "B9" in title:
          player_scores[name]["B9"] = scores
        elif "F18" in title:
          player_scores[name]["F18"] = scores
        else:
          print(f"Could not identify card type of {title}")
          continue

    driver.back()
    wait.until(EC.presence_of_element_located((By.CLASS_NAME, "open_tournament")))

  if tour_type == "weekly":
    return {
      "tourney_id": f"Wk {week_number} - {tourney_name}",
      "type": "Tour",
      "start_date": start_date,
      "players": list(player_scores.values())
    }
  else:
    return {
      "tourney_id": f"{month} - {birthstone}",
      "type": "Stonehenge",
      "start_date": start_date,
      "players": list(player_scores.values())
    }

def main():
  load_dotenv()

  username = os.getenv("MY_USERNAME")
  password = os.getenv("MY_PASSWORD")
  mongo_uri = os.getenv("MONGO_URI")
  LOGIN_PAGE = os.getenv("LOGIN")
  TOURNEY_PAGE = os.getenv("TOURNEY_PAGE")

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
      EC.element_to_be_clickable((By.CLASS_NAME, "osano-cm-accept"))
    )
    cookie_accept_btn.click()
  except TimeoutException:
    print("No cookie banner appeared - continuing.")

  login_button = driver.find_element(By.ID, "LoginBtn")
  login_button.click()

  # 3. Logged in and can proceed to scrape or navigate
  driver.get(TOURNEY_PAGE)

  # Make sure that the tournaments have rendered
  wait.until(EC.presence_of_element_located((By.CLASS_NAME, "open_tournament")))

  # Temporary dictionary to hold all scores of players by tournament and round
  player_scores = {}

  # Scrape all of the C2C Stonehenge and C2C Tour tournaments
  stonehenge_metadata = []
  tour_metadata = []

  tournaments = driver.find_elements(By.CLASS_NAME, "open_tournament")
  for idx, tourney in enumerate(tournaments):
    # Get all the tournaments (again), make sure driver is not stale
    title = tourney.find_element(By.CLASS_NAME, "title").text

    if "C2C Stonehenge" in title:
      stonehenge_metadata.append({"index": idx, "title": title})
    elif "C2C Tour" in title:
      tour_metadata.append({"index": idx, "title": title})

  if len(stonehenge_metadata) != 0:
    tournament_doc = scrape_leaderboards(stonehenge_metadata, "monthly")
    collection.insert_one(tournament_doc)

  if len(tour_metadata) != 0:
    tournament_doc = scrape_leaderboards(tour_metadata, "weekly")
    collection.insert_one(tournament_doc)

  input("Press Enter to exit and close the browser...")
  driver.quit()

if __name__ == "__main__":
  main()