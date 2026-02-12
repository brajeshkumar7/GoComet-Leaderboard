#!/usr/bin/env python3
"""
Load Testing Script for Gaming Leaderboard API
Simulates real user behavior by continuously submitting scores and fetching leaderboard data.
"""

import requests
import random
import time
import sys
from datetime import datetime

# Configuration
API_BASE_URL = "http://localhost:3000/api/leaderboard"
MAX_USER_ID = 1000000  # Adjust based on your database size
MIN_SCORE = 100
MAX_SCORE = 10000
MIN_SLEEP = 0.5  # seconds
MAX_SLEEP = 2.0  # seconds

# Statistics
stats = {
    'submissions': 0,
    'top_fetches': 0,
    'rank_lookups': 0,
    'errors': 0,
    'start_time': None
}


def submit_score(user_id):
    """Submit a score for a user"""
    try:
        score = random.randint(MIN_SCORE, MAX_SCORE)
        response = requests.post(
            f"{API_BASE_URL}/submit",
            json={"user_id": user_id, "score": score},
            timeout=5
        )
        stats['submissions'] += 1
        
        if response.status_code == 201:
            data = response.json()
            if data.get('success'):
                return data.get('data', {})
            else:
                print(f"❌ Submit failed: {data.get('error', 'Unknown error')}")
                stats['errors'] += 1
        else:
            print(f"❌ Submit failed: HTTP {response.status_code}")
            stats['errors'] += 1
            return None
    except requests.exceptions.RequestException as e:
        print(f"❌ Submit error: {e}")
        stats['errors'] += 1
        return None


def get_top_players():
    """Fetch top 10 players"""
    try:
        response = requests.get(f"{API_BASE_URL}/top", timeout=5)
        stats['top_fetches'] += 1
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                return data.get('data', [])
            else:
                print(f"❌ Top fetch failed: {data.get('error', 'Unknown error')}")
                stats['errors'] += 1
        else:
            print(f"❌ Top fetch failed: HTTP {response.status_code}")
            stats['errors'] += 1
            return None
    except requests.exceptions.RequestException as e:
        print(f"❌ Top fetch error: {e}")
        stats['errors'] += 1
        return None


def get_user_rank(user_id):
    """Fetch user's rank"""
    try:
        response = requests.get(f"{API_BASE_URL}/rank/{user_id}", timeout=5)
        stats['rank_lookups'] += 1
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                return data.get('data', {})
            else:
                print(f"❌ Rank lookup failed: {data.get('error', 'Unknown error')}")
                stats['errors'] += 1
        elif response.status_code == 404:
            # User not found is not an error, just info
            return None
        else:
            print(f"❌ Rank lookup failed: HTTP {response.status_code}")
            stats['errors'] += 1
            return None
    except requests.exceptions.RequestException as e:
        print(f"❌ Rank lookup error: {e}")
        stats['errors'] += 1
        return None


def print_stats():
    """Print current statistics"""
    elapsed = time.time() - stats['start_time']
    print(f"\n{'='*60}")
    print(f"📊 Statistics (Runtime: {elapsed:.1f}s)")
    print(f"{'='*60}")
    print(f"✅ Submissions:     {stats['submissions']}")
    print(f"✅ Top Fetches:     {stats['top_fetches']}")
    print(f"✅ Rank Lookups:    {stats['rank_lookups']}")
    print(f"❌ Errors:          {stats['errors']}")
    if elapsed > 0:
        print(f"📈 Submissions/sec: {stats['submissions']/elapsed:.2f}")
    print(f"{'='*60}\n")


def main():
    """Main loop"""
    print("🚀 Starting Load Test for Gaming Leaderboard API")
    print(f"📍 API Base URL: {API_BASE_URL}")
    print(f"👥 Max User ID: {MAX_USER_ID}")
    print(f"🎯 Score Range: {MIN_SCORE} - {MAX_SCORE}")
    print(f"⏱️  Sleep Range: {MIN_SLEEP} - {MAX_SLEEP} seconds")
    print("\nPress Ctrl+C to stop and see statistics\n")
    
    stats['start_time'] = time.time()
    
    try:
        iteration = 0
        while True:
            iteration += 1
            user_id = random.randint(1, MAX_USER_ID)
            
            # Submit score
            print(f"[{iteration}] Submitting score for user {user_id}...", end=" ")
            result = submit_score(user_id)
            if result:
                print(f"✅ Rank: {result.get('rank', 'N/A')}, Total Score: {result.get('total_score', 'N/A')}")
            else:
                print("❌ Failed")
            
            # Fetch top players
            print(f"[{iteration}] Fetching top 10...", end=" ")
            top_players = get_top_players()
            if top_players:
                print(f"✅ Found {len(top_players)} players")
                if len(top_players) > 0:
                    print(f"   🏆 #1: User {top_players[0].get('user_id')} - Score: {top_players[0].get('total_score')}")
            else:
                print("❌ Failed")
            
            # Fetch user rank
            print(f"[{iteration}] Looking up rank for user {user_id}...", end=" ")
            rank_data = get_user_rank(user_id)
            if rank_data:
                print(f"✅ Rank: {rank_data.get('rank', 'N/A')}")
            else:
                print("ℹ️  User not found")
            
            # Sleep before next iteration
            sleep_time = random.uniform(MIN_SLEEP, MAX_SLEEP)
            print(f"[{iteration}] Sleeping {sleep_time:.2f}s...\n")
            time.sleep(sleep_time)
            
            # Print stats every 10 iterations
            if iteration % 10 == 0:
                print_stats()
                
    except KeyboardInterrupt:
        print("\n\n⏹️  Stopping load test...")
        print_stats()
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        print_stats()
        sys.exit(1)


if __name__ == "__main__":
    main()
