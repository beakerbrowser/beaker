-- more default bookmarks
INSERT INTO bookmarks (profileId, title, url, pinned) VALUES (0, 'Hashbase.io', 'https://hashbase.io', 1);
INSERT INTO bookmarks (profileId, title, url, pinned) VALUES (0, 'Pastedat', 'dat://pastedat-taravancil.hashbase.io', 1);
INSERT INTO bookmarks (profileId, title, url, pinned) VALUES (0, 'Dat RSS Reader', 'dat://rss-reader-pfrazee.hashbase.io', 1);
INSERT INTO bookmarks (profileId, title, url, pinned) VALUES (0, 'WYSIWYWiki', 'dat://wysiwywiki-pfrazee.hashbase.io', 1);
INSERT INTO bookmarks (profileId, title, url, pinned) VALUES (0, 'Paul Frazee', 'dat://pfrazee.hashbase.io', 1);
INSERT INTO bookmarks (profileId, title, url, pinned) VALUES (0, 'Tara Vancil', 'dat://taravancil.com', 1);

PRAGMA user_version = 5;