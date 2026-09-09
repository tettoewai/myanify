-- Global VIP toggle. When vip_enabled = 'false', everyone gets VIP features.
INSERT INTO "AppSetting" ("key", "value", "updatedAt") VALUES
    ('vip_enabled', 'true', NOW())
ON CONFLICT ("key") DO NOTHING;
