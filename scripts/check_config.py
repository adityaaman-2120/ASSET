"""Quick config validation script."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

from src.config import get_settings

s = get_settings()

print("=" * 50)
print("ASSETS - Configuration Check")
print("=" * 50)

# Required
groq_ok = bool(s.groq_api_key)
print(f"Groq API Key:     {'[OK]' if groq_ok else '[MISSING]'}")

# Optional - DhanHQ
dhan_ok = bool(s.dhan_client_id and s.dhan_access_token)
print(f"DhanHQ API:       {'[OK]' if dhan_ok else '[Not configured - optional]'}")

# Free tier
print(f"\nData Source:      {s.market_data_source}")
print(f"Execution Mode:   {s.execution_mode}")
print(f"Paper Wallet:     Rs.{s.paper_wallet_balance:,.0f}")
print(f"News Analysis:    {'[Enabled]' if s.enable_news_analysis else '[Disabled]'}")

# Telegram
telegram_ok = bool(getattr(s, 'telegram_bot_token', None) and getattr(s, 'telegram_chat_id', None))
print(f"Telegram Alerts:  {'[OK]' if telegram_ok else '[Not configured - optional]'}")

print("\n" + "=" * 50)
if groq_ok:
    print("[READY] System ready to run!")
else:
    print("[ERROR] Please set GROQ_API_KEY in .env")
print("=" * 50)
