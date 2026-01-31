import os
from pymongo import MongoClient
from collections import defaultdict
from datetime import datetime, timedelta
from dateutil.parser import parse
from dotenv import load_dotenv

load_dotenv()

mongo_uri = os.getenv("MONGO_URI")

client = MongoClient(mongo_uri)
db = client["tournaments_db"]
leaderboards_collection = db["leaderboards"]
handicaps_collection = db["handicaps"]

BASELINE = 66
MAX_ROUNDS = 20
START_DATE = datetime(2025, 6, 29)
END_OF_DEC25 = datetime(2025, 12, 31) # used to determine HC calc 2026 beginning
TODAY = datetime.today().replace(hour=0, minute=0, second=0, microsecond=0)
WEEK_STEP = timedelta(days=7)

player_rounds = defaultdict(list)
today = datetime.today()

def parse_score(score):
  try:
    return int(score)
  except:
    return None

def collect_rounds(before_date):
  player_rounds = defaultdict(list)

  for doc in leaderboards_collection.find({}, {"players": 1, "end_date": 1, "type": 1}):
    end_date = doc.get("end_date")
    tourney_type = doc.get("type")

    if not end_date:
      continue
    if isinstance(end_date, str):
      end_date = datetime.fromisoformat(end_date)
    # If the tournament has not ended yet
    if end_date > before_date:
      continue
    # Exclude Stonehenge from 2026 HC calculations
    if before_date >= END_OF_DEC25 and tourney_type == "Stonehenge": 
      continue
    # Exclude Shootout rounds from HC calculations
    if tourney_type == "Shootout":
      continue

    for player in doc.get("players", []):
      name = player.get("name")
      if not name:
        continue

      for key in ["F9", "B9", "F18"]:
        if key in player:
          raw = player[key]

          # Stonehenge
          if isinstance(raw, list):
            for score in raw:
              val = parse_score(score) # turns the score into an int
              if val is None:
                continue
              if key in ["F9", "B9"]:
                val *= 2
              player_rounds[name].append((val, end_date))
          # If score is an integer or string representation
          elif isinstance(raw, (int, str)): 
            val = parse_score(raw)
            if val is None:
              continue
            if key in ["F9", "B9"]:
              val *= 2
            player_rounds[name].append((val, end_date))    

  return player_rounds

def compute_handicap(rounds):
  recent = sorted(rounds, key=lambda x: x[1], reverse=True)[:MAX_ROUNDS]

  scores_only = []

  for score, _ in recent:
    try:
      scores_only.append(int(score))
    except (ValueError, TypeError):
      continue

  if not scores_only:
    return None

  diffs = [s - BASELINE for s in scores_only]

  return round(sum(diffs) / len(diffs), 2)
    
def main():
  current_date = START_DATE

  while current_date <= TODAY:
    print(f"Calculating handicaps for week ending: {current_date.date()}...")
    player_rounds = collect_rounds(current_date)

    weekly_handicap_doc = []

    for player, rounds in player_rounds.items():
      handicap = compute_handicap(rounds)

      if handicap is not None:
        weekly_handicap_doc.append({
          "name": player,
          "avg_handicap": handicap        
        })

    for doc in weekly_handicap_doc:
      print(doc)

    handicaps_collection.replace_one(
      { "_id": current_date },
      {
        "_id": current_date,
        "handicaps": weekly_handicap_doc
      },
      upsert=True
    )

    current_date += WEEK_STEP

if __name__ == "__main__":
    main()