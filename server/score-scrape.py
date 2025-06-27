from dotenv import load_dotenv
import os
import time

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException
import tempfile

from pymongo import MongoClient

chrome_options = Options()

# Create a temporary profile directory
temp_profile = tempfile.mkdtemp()
chrome_options.add_argument(f"--user-data-dir={temp_profile}")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")
# chrome_options.add_argument("--headless=new")  # optional: run without GUI
# options.add_argument("--disable-gpu")           # uncomment these 3 lines when running headless
# options.add_argument("--window-size=1920,1080")

driver = webdriver.Chrome(options=chrome_options)
driver.get("https://www.wgt.com/login.aspx")  # page with sign in button

wait = WebDriverWait(driver, 10)
wait.until(lambda d: d.execute_script('return document.readyState') == 'complete')

load_dotenv()

username = os.getenv("MY_USERNAME")
password = os.getenv("MY_PASSWORD")
mongo_uri = os.getenv("MONGO_URI")

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
  # print("Cookie banner dismissed.")
except TimeoutException:
  print("No cookie banner appeared - continuing.")

login_button = driver.find_element(By.ID, "LoginBtn")
login_button.click()

# 3. Logged in and can proceed to scrape or navigate
driver.get("https://www.wgt.com/clubs/tournaments.aspx")

# Make sure that the tournaments have rendered
wait.until(EC.presence_of_element_located((By.CLASS_NAME, "open_tournament")))

# Get all the tournaments (count)
tourney_count = len(driver.find_elements(By.CLASS_NAME, "open_tournament"))

for i in range(tourney_count):
  # Get all the tournaments (again), make sure driver is not stale
  tournaments = driver.find_elements(By.CLASS_NAME, "open_tournament")
  t = tournaments[i]
  title_element = t.find_element(By.CLASS_NAME, "title")

  title = title_element.text.strip()
  if "C2C Stonehenge" not in title and "C2C Tour" not in title:
    continue
  
  print(f"Scraping {title}...")

  leaderboard_btn = t.find_element(By.CLASS_NAME, "leaderboard_button")
  leaderboard_btn.click()

  wait.until(EC.presence_of_element_located((By.XPATH, '//tr[@data-uid]')))

  # Find the table, and scrape the entries
  rows = driver.find_elements(By.XPATH, '//table//tr[@data-uid]')
  for row in rows:
    cells = row.find_elements(By.TAG_NAME, 'td')

    if "C2C Stonehenge" in title:
      entry = {
        "title": title
        "rank": cells[0].text
        "player": cells[1].text
        "r1": cells[3].text
        "r2": cells[4].text
        "r3": cells[5].text
        "r4": cells[6].text
        "final": cells[7].text
      }
      
      print(f"{entry[rank]}. {entry[player]} - R1:{entry[r1]} R2:{entry[r2]} R3:{entry[r3]} R4:{entry[r4]} Final:{entry[final]}")
    # C2C Tour otherwise
    elif "C2C Tour" in title:
      entry = {
        "title": title
        "rank": cells[0].text
        "player": cells[1].text
        "final": cells[4].text
      }

      print(f"{entry[rank]}. {entry[player]} - Final:{entry[final]}")
    else:
      continue

  driver.back()
  wait.until(EC.presence_of_element_located((By.CLASS_NAME, "open_tournament")))

input("Press Enter to exit and close the browser...")
driver.quit()