-- Global VIP toggle. When vip_enabled = 'false', everyone gets VIP features.
INSERT INTO "AppSetting" ("key", "value") VALUES
    ('vip_enabled', 'true')
ON CONFLICT ("key") DO NOTHING;
