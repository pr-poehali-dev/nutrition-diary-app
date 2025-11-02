-- Создание таблицы для записей дневника питания
CREATE TABLE food_entries (
    id VARCHAR(50) PRIMARY KEY,
    products JSONB NOT NULL,
    entry_date TIMESTAMP NOT NULL,
    has_allergy BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индекс для быстрого поиска по дате
CREATE INDEX idx_food_entries_date ON food_entries(entry_date DESC);

-- Индекс для фильтрации по аллергии
CREATE INDEX idx_food_entries_allergy ON food_entries(has_allergy);