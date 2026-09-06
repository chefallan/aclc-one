import sys
import os
import asyncio
import json
import argparse

# Default high quality neural voices
DEFAULT_VOICE = "en-US-AriaNeural"

async def synthesize_neural_speech(text: str, voice: str = DEFAULT_VOICE, rate: str = "+0%", pitch: str = "+0Hz", output_file: str = None) -> bytes:
    try:
        import edge_tts
    except ImportError:
        raise RuntimeError("edge-tts library is not installed. Please install it using 'pip install edge-tts'.")
        
    communicate = edge_tts.Communicate(text=text, voice=voice, rate=rate, pitch=pitch)
    
    if output_file:
        await communicate.save(output_file)
        with open(output_file, "rb") as f:
            return f.read()
    else:
        audio_chunks = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_chunks.append(chunk["data"])
        return b"".join(audio_chunks)

async def list_available_neural_voices():
    try:
        import edge_tts
        voices = await edge_tts.list_voices()
        return [
            {
                "Name": v["Name"],
                "ShortName": v["ShortName"],
                "Gender": v["Gender"],
                "Locale": v["Locale"],
                "FriendlyName": v.get("FriendlyName", "")
            }
            for v in voices
        ]
    except Exception as e:
        return [{"error": str(e)}]

def main():
    parser = argparse.ArgumentParser(description="Bing / Edge Neural TTS Synthesizer")
    parser.add_argument("--text", type=str, help="Text to synthesize")
    parser.add_argument("--voice", type=str, default=DEFAULT_VOICE, help="Neural Voice ShortName")
    parser.add_argument("--rate", type=str, default="+0%", help="Speed adjustment (e.g. +10%, -10%)")
    parser.add_argument("--pitch", type=str, default="+0Hz", help="Pitch adjustment")
    parser.add_argument("--out", type=str, help="Output MP3 file path")
    parser.add_argument("--list-voices", action="store_true", help="List available neural voices")
    
    args = parser.parse_args()
    
    if args.list_voices:
        voices = asyncio.run(list_available_neural_voices())
        print(json.dumps(voices, indent=2))
        return
        
    if not args.text:
        # Read from stdin if not in args
        args.text = sys.stdin.read().strip()
        
    if not args.text:
        print(json.dumps({"error": "No text provided for synthesis"}), file=sys.stderr)
        sys.exit(1)
        
    audio_bytes = asyncio.run(synthesize_neural_speech(
        text=args.text,
        voice=args.voice,
        rate=args.rate,
        pitch=args.pitch,
        output_file=args.out
    ))
    
    if not args.out:
        # Write binary stream to stdout
        if sys.platform == "win32":
            import msvcrt
            msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)
        sys.stdout.buffer.write(audio_bytes)

if __name__ == "__main__":
    main()
