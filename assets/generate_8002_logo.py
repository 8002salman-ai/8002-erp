from PIL import Image, ImageDraw, ImageFont

SIZE = 2048
OUTPUT = "assets/8002-infinity-ask-hires.png"


def load_font(name: str, size: int):
    try:
        return ImageFont.truetype(name, size)
    except OSError:
        return None


def main():
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    center = SIZE // 2
    radius = int(SIZE * 0.43)
    left = center - radius
    top = center - radius
    right = center + radius
    bottom = center + radius

    # Radial-style red gradient background (premium style)
    for i in range(radius, 0, -1):
        t = i / radius
        r = int(160 + (220 - 160) * (1 - t))
        g = int(20 + (38 - 20) * (1 - t))
        b = int(30 + (55 - 30) * (1 - t))
        alpha = int(255)
        draw.ellipse((center - i, center - i, center + i, center + i), fill=(r, g, b, alpha))

    # Outer/inner rings
    draw.ellipse((left, top, right, bottom), outline=(255, 220, 220, 180), width=18)
    inset = 32
    draw.ellipse((left + inset, top + inset, right - inset, bottom - inset), outline=(255, 255, 255, 80), width=8)

    # Soft highlight
    glow_r = int(radius * 0.75)
    glow_x = center - int(radius * 0.24)
    glow_y = center - int(radius * 0.30)
    draw.ellipse((glow_x - glow_r, glow_y - glow_r, glow_x + glow_r, glow_y + glow_r), fill=(255, 255, 255, 28))

    # Fonts
    logo_font = (
        load_font("arialbd.ttf", 430)
        or load_font("seguisb.ttf", 430)
        or load_font("segoeuib.ttf", 430)
        or ImageFont.load_default()
    )
    ask_font = (
        load_font("arialbd.ttf", 170)
        or load_font("seguisb.ttf", 170)
        or load_font("segoeuib.ttf", 170)
        or ImageFont.load_default()
    )

    # Draw 8∞2
    logo_text = "8∞2"
    bbox = draw.textbbox((0, 0), logo_text, font=logo_font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    text_x = center - text_w // 2
    text_y = center - int(text_h * 0.72)
    draw.text((text_x, text_y), logo_text, font=logo_font, fill=(255, 255, 255, 255))

    # Draw ASK below
    ask_text = "ASK"
    ask_bbox = draw.textbbox((0, 0), ask_text, font=ask_font)
    ask_w = ask_bbox[2] - ask_bbox[0]
    ask_x = center - ask_w // 2
    ask_y = center + int(radius * 0.28)
    draw.text((ask_x, ask_y), ask_text, font=ask_font, fill=(255, 244, 244, 248))

    img.save(OUTPUT, "PNG")
    print(f"Saved {OUTPUT}")


if __name__ == "__main__":
    main()
