-- more default bookmarks
INSERT INTO bookmarks (profileId, title, url, pinned) VALUES (0, 'Dat Project', 'dat://datproject.org', 1);
INSERT INTO bookmarks (profileId, title, url, pinned) VALUES (0, 'Documentation', 'dat://beakerbrowser.com/docs', 1);
INSERT INTO bookmarks (profileId, title, url, pinned) VALUES (0, 'Explore the p2p Web', 'dat://taravancil.com/explore-the-p2p-web.md', 1);
INSERT INTO bookmarks (profileId, title, url, pinned) VALUES (0, 'Support Beaker', 'https://opencollective.com/beaker', 1);


PRAGMA user_version = 15;