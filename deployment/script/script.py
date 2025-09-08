#!/usr/bin/env python3

import json
import sys
from pathlib import Path
from solders.keypair import Keypair
import base58

def create_new_keypair():
    """
    Create a new random Solana keypair
    """
    try:
        keypair = Keypair()
        secret_key_bytes = keypair.secret()
        base58_secret_key = base58.b58encode(secret_key_bytes).decode('utf-8')
        full_keypair_bytes = bytes(keypair)
        return keypair, base58_secret_key, full_keypair_bytes
    except Exception as e:
        raise Exception(f"Error creating new keypair: {str(e)}")

def create_keypair_from_file(keypair_path):
    """
    Create keypair from a JSON file containing seed bytes
    """
    try:
        path = Path(keypair_path)
        if not path.exists():
            raise FileNotFoundError(f"Keypair file not found: {keypair_path}")

        with open(path, 'r') as f:
            keypair_data = json.load(f)

        if isinstance(keypair_data, list):
            seed_bytes = bytes(keypair_data)
        else:
            raise ValueError("Expected keypair file to contain array of bytes")

        print(f"Loaded seed bytes length: {len(seed_bytes)}")
        keypair = Keypair.from_bytes(seed_bytes)
        secret_key_bytes = keypair.secret()
        base58_secret_key = base58.b58encode(secret_key_bytes).decode('utf-8')

        return keypair, base58_secret_key

    except json.JSONDecodeError:
        raise ValueError("Invalid JSON format in keypair file")
    except Exception as e:
        raise Exception(f"Error processing keypair: {str(e)}")

def save_keypair_to_file(keypair_bytes, filename):
    """
    Save keypair bytes to a JSON file
    """
    try:
        keypair_array = list(keypair_bytes)
        with open(filename, 'w') as f:
            json.dump(keypair_array, f, indent=2)
        print(f"Keypair saved to: {filename}")
    except Exception as e:
        print(f"Error saving keypair: {e}")

def main():
    if len(sys.argv) == 1:
        print("=== Creating New Keypair ===")
        try:
            keypair, base58_secret_key, full_keypair_bytes = create_new_keypair()

            print(f"Public Key: {keypair.pubkey()}")
            print(f"Base58 Secret Key: {base58_secret_key}")

            # Ask if user wants to save the keypair
            save_choice = input("\nDo you want to save this keypair to a file? (y/n): ").lower().strip()
            if save_choice in ['y', 'yes']:
                filename = input("Enter filename (default: keypair.json): ").strip()
                if not filename:
                    filename = "keypair.json"
                save_keypair_to_file(full_keypair_bytes, filename)

        except Exception as e:
            print(f"Error: {e}")
            sys.exit(1)

    elif len(sys.argv) == 2:
        keypair_path = sys.argv[1]
        print(f"=== Loading Keypair from File: {keypair_path} ===")
        try:
            keypair, base58_secret_key = create_keypair_from_file(keypair_path)

            print(f"Public Key: {keypair.pubkey()}")
            print(f"Base58 Secret Key: {base58_secret_key}")

        except Exception as e:
            print(f"Error: {e}")
            sys.exit(1)

    else:
        print("Usage:")
        print("  python script.py                    # Create new keypair")
        print("  python script.py <keypair.json>     # Load keypair from file")
        sys.exit(1)

if __name__ == "__main__":
    main()