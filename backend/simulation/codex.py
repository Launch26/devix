"""
codex.py - Data encoding utilities.
Handles the conversion of string payloads into different numerical bases,
simulating encoding transformations as a packet moves between nodes with
different 'codex' levels.
"""

def ascii_to_base(ascii_val, base):
    """
    Converts a single ASCII integer value into a string representation of a given numerical base (up to base-36).
    
    Args:
        ascii_val (int): The integer ASCII value of a character.
        base (int): The target base to convert to (e.g., 2, 8, 16, 36).
        
    Returns:
        str: The string representation of the value in the new base.
    """
    if ascii_val == 0:
        return "0"
    digits = []
    chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    while ascii_val > 0:
        digits.append(chars[ascii_val % base])
        ascii_val //= base
    return "".join(reversed(digits))

def encode_payload(text, base):
    """
    Encodes an entire string payload into an array of base-converted strings.
    
    Args:
        text (str): The plaintext (or ciphertext) string to encode.
        base (int): The target numerical base (codex level).
        
    Returns:
        list: A list of encoded string values corresponding to each character in the text.
    """
    return [ascii_to_base(ord(c), base) for c in text]
