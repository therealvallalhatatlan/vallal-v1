-- Add optional multiple image support for spot cover gallery
ALTER TABLE sticker_spots
ADD COLUMN IF NOT EXISTS image_urls TEXT[];
