import os
from pymongo import MongoClient
from collections import defaultdict
from datetime import datetime
from dateutil.parser import parse

mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/")

client = MongoClient(mongo_uri)
db = client["tournaments_db"]
leaderboards = db["leaderboards"]

BASELINE = 66
MAX_ROUNDS = 20

player_rounds = defaultdict(list)
today = datetime.today()

def main():
  # Step 1: Gather all tournament data
  for leaderboard in leaderboards.find({}, { "players": 1, "end_date": 1 }):
    date = leaderboard.get("end_date")

    if isinstance(date, str):
      try:
        date = parse(date)
      except:
        continue
    
    if not isinstance(date, datetime) or date > today:
      continue

    for player in leaderboard.get("players", []):
      name = player.get("name")
      if not name:
        continue

      for key in ["F9", "B9", "F18"]:
        if key in player:
          try:
            raw_score = player[key]
            # Stonehenge: multiple scores
            if isinstance(raw_score, list):
              for score in raw_score:
                if key in ["F9", "B9"]:
                  score = int(score)
                  score *= 2  # Normalize to 18 holes
                  player_rounds[name].append((score, date))
                
            # Tour: single score
            else:
              score = int(raw_score)

              if key in ["F9", "B9"]:
                score *= 2  # Normalize to 18 holes
                player_rounds[name].append((score, date))

          except (ValueError, TypeError):
            continue  # Skip bad scores

  # Step 2: Compute handicaps
  results = []

  for player, rounds in player_rounds.items():
    sorted_scores = sorted(rounds, key=lambda x: x[1], reverse=True)
    top_scores = [s for s, _ in sorted_scores[:MAX_ROUNDS]]

    if not top_scores:
      continue

    handicaps_list = [s - BASELINE for s in top_scores]

    avg_handicap = round(sum(handicaps_list) / len(handicaps_list), 2)

    results.append({
      "player": player,
      "average_handicap": avg_handicap
    })

  # Step 3: Print results
  for result in results:
    print(result)

if __name__ == "__main__":
    main()