export default `

-- remove deprecations
DROP TRIGGER IF EXISTS crawl_discussions_au;
DROP TRIGGER IF EXISTS crawl_discussions_ad;
DROP TRIGGER IF EXISTS crawl_discussions_ai;
DROP TRIGGER IF EXISTS crawl_media_au;
DROP TRIGGER IF EXISTS crawl_media_ad;
DROP TRIGGER IF EXISTS crawl_media_ai;
DROP TRIGGER IF EXISTS crawl_site_descriptions_au;
DROP TRIGGER IF EXISTS crawl_site_descriptions_ad;
DROP TRIGGER IF EXISTS crawl_site_descriptions_ai;
DROP TRIGGER IF EXISTS crawl_dats_au;
DROP TRIGGER IF EXISTS crawl_dats_ad;
DROP TRIGGER IF EXISTS crawl_dats_ai;
DROP TRIGGER IF EXISTS crawl_bookmarks_au;
DROP TRIGGER IF EXISTS crawl_bookmarks_ad;
DROP TRIGGER IF EXISTS crawl_bookmarks_ai;
DROP TRIGGER IF EXISTS crawl_comments_au;
DROP TRIGGER IF EXISTS crawl_comments_ad;
DROP TRIGGER IF EXISTS crawl_comments_ai;
DROP TRIGGER IF EXISTS crawl_statuses_au;
DROP TRIGGER IF EXISTS crawl_statuses_ad;
DROP TRIGGER IF EXISTS crawl_statuses_ai;
DROP TABLE IF EXISTS crawl_discussions_tags;
DROP TABLE IF EXISTS crawl_discussions_fts_index;
DROP TABLE IF EXISTS crawl_discussions;
DROP TABLE IF EXISTS crawl_media_tags;
DROP TABLE IF EXISTS crawl_media_fts_index;
DROP TABLE IF EXISTS crawl_media;
DROP TABLE IF EXISTS crawl_site_descriptions_fts_index;
DROP TABLE IF EXISTS crawl_site_descriptions;
DROP TABLE IF EXISTS crawl_dats_fts_index;
DROP TABLE IF EXISTS crawl_dats;
DROP TABLE IF EXISTS crawl_follows;
DROP TABLE IF EXISTS crawl_bookmarks_tags;
DROP TABLE IF EXISTS crawl_bookmarks_fts_index;
DROP TABLE IF EXISTS crawl_bookmarks;
DROP TABLE IF EXISTS crawl_votes;
DROP TABLE IF EXISTS crawl_reactions;
DROP TABLE IF EXISTS crawl_comments_fts_index;
DROP TABLE IF EXISTS crawl_comments;
DROP TABLE IF EXISTS crawl_statuses_fts_index;
DROP TABLE IF EXISTS crawl_statuses;
DROP TABLE IF EXISTS crawl_tags;
DROP TABLE IF EXISTS crawl_sources_meta;
DROP TABLE IF EXISTS crawl_sources;

PRAGMA user_version = 43;
`