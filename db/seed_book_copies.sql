-- Seed book_copies with numbers 1-100 if they do not exist
INSERT INTO book_copies (copy_number)
SELECT n FROM generate_series(1, 100) AS s(n)
ON CONFLICT (copy_number) DO NOTHING;