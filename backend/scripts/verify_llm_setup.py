#!/usr/bin/env python3
"""
Verify LLM setup - checks Groq and OpenAI configuration
"""
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

def check_env_var(name: str, required: bool = False) -> bool:
    """Check if environment variable is set"""
    value = os.getenv(name)
    if value:
        print(f"✅ {name}: Set ({value[:20]}...)")
        return True
    else:
        status = "❌" if required else "⚠️"
        print(f"{status} {name}: Not set")
        return False

def verify_groq():
    """Verify Groq setup"""
    print("\n🚀 Checking Groq Configuration...")
    
    has_key = check_env_var("GROQ_API_KEY")
    check_env_var("GROQ_MODEL")
    
    if has_key:
        try:
            from groq import Groq
            client = Groq(api_key=os.getenv("GROQ_API_KEY"))
            print("✅ Groq client initialized successfully")
            return True
        except ImportError:
            print("❌ Groq package not installed. Run: pip install groq")
            return False
        except Exception as e:
            print(f"❌ Groq initialization failed: {e}")
            return False
    else:
        print("⚠️  Groq not configured (will use OpenAI fallback)")
        return False

def verify_openai():
    """Verify OpenAI setup"""
    print("\n🔄 Checking OpenAI Configuration (Fallback)...")
    
    has_key = check_env_var("OPENAI_API_KEY")
    check_env_var("OPENAI_MODEL")
    
    if has_key:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            print("✅ OpenAI client initialized successfully")
            return True
        except ImportError:
            print("❌ OpenAI package not installed. Run: pip install openai")
            return False
        except Exception as e:
            print(f"❌ OpenAI initialization failed: {e}")
            return False
    else:
        print("⚠️  OpenAI not configured")
        return False

def verify_llm_client():
    """Verify LLMClientManager"""
    print("\n🎯 Checking LLMClientManager...")
    
    try:
        from app.services.llm_client import LLMClientManager
        
        client = LLMClientManager()
        print("✅ LLMClientManager initialized successfully")
        
        if client._groq_client:
            print(f"   ✅ Groq client active (model: {client._groq_model})")
        else:
            print("   ⚠️  Groq client not available")
        
        if client._openai_client:
            print(f"   ✅ OpenAI client active (model: {client._openai_model})")
        else:
            print("   ⚠️  OpenAI client not available")
        
        return True
    except ValueError as e:
        print(f"❌ LLMClientManager initialization failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def main():
    """Main verification"""
    print("=" * 60)
    print("🔍 LLM Configuration Verification")
    print("=" * 60)
    
    groq_ok = verify_groq()
    openai_ok = verify_openai()
    client_ok = verify_llm_client()
    
    print("\n" + "=" * 60)
    print("📊 Summary")
    print("=" * 60)
    
    if groq_ok and openai_ok:
        print("✅ OPTIMAL: Both Groq and OpenAI configured")
        print("   → Groq will be used first (fast & cheap)")
        print("   → OpenAI as fallback (reliable)")
    elif groq_ok:
        print("✅ GOOD: Groq configured")
        print("   → Fast and cheap inference")
        print("   ⚠️  No fallback if Groq fails")
    elif openai_ok:
        print("⚠️  FALLBACK ONLY: Only OpenAI configured")
        print("   → Will work but slower and more expensive")
        print("   → Consider adding Groq for better performance")
    else:
        print("❌ ERROR: No LLM provider configured")
        print("   → Add GROQ_API_KEY or OPENAI_API_KEY to .env")
        return 1
    
    if not client_ok:
        print("\n❌ LLMClientManager failed to initialize")
        return 1
    
    print("\n✅ All checks passed! LLM system ready.")
    print("\n💡 Recommendations:")
    if not groq_ok:
        print("   • Get free Groq API key: https://console.groq.com")
        print("   • Add to .env: GROQ_API_KEY=gsk_...")
    if not openai_ok:
        print("   • Add OpenAI as fallback: https://platform.openai.com")
        print("   • Add to .env: OPENAI_API_KEY=sk-...")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
