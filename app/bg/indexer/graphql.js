export const SCHEMA = `
scalar Object
scalar Long

enum RecordType {
  file
  folder
}

type Link {
  source: String!
  origin: String!
  path: String!
  url: String!
}

type Record {
  type: RecordType
  path: String
  url: String
  ctime: Long
  mtime: Long
  rtime: Long
  metadata: Object
  site: Site
  index: String
  links: [Link!]
  linkedSites(indexes: [String]): [Site]
  content: String
  backlinks(
    search: String,
    origins: [String],
    excludeOrigins: [String],
    paths: [String],
    metadata: [MetadataQuery],
    links: LinkQuery,
    backlinks: BacklinkQuery,
    indexes: [String],
    before: RangeQuery,
    after: RangeQuery,
    sort: String,
    offset: Int,
    limit: Int,
    reverse: Boolean
  ): [Record]
  backlinkCount(
    search: String,
    origins: [String],
    excludeOrigins: [String],
    paths: [String],
    metadata: [MetadataQuery],
    links: LinkQuery,
    backlinks: BacklinkQuery,
    indexes: [String],
    before: RangeQuery,
    after: RangeQuery
  ): Long
}

type Site {
  url: String!
  title: String
  description: String
  writable: Boolean!
  records(
    search: String,
    paths: [String],
    metadata: [MetadataQuery],
    links: LinkQuery,
    backlinks: BacklinkQuery,
    indexes: [String],
    before: RangeQuery,
    after: RangeQuery,
    sort: String,
    offset: Int,
    limit: Int,
    reverse: Boolean
  ): [Record]
  recordCount(
    search: String,
    paths: [String],
    metadata: [MetadataQuery],
    links: LinkQuery,
    backlinks: BacklinkQuery,
    indexes: [String],
    before: RangeQuery,
    after: RangeQuery
  ): Long
  backlinks(
    search: String,
    origins: [String],
    excludeOrigins: [String],
    paths: [String],
    metadata: [MetadataQuery],
    links: LinkQuery,
    backlinks: BacklinkQuery,
    indexes: [String],
    before: RangeQuery,
    after: RangeQuery,
    sort: String,
    offset: Int,
    limit: Int,
    reverse: Boolean
  ): [Record]
  backlinkCount(
    search: String,
    origins: [String],
    excludeOrigins: [String],
    paths: [String],
    metadata: [MetadataQuery],
    links: LinkQuery,
    backlinks: BacklinkQuery,
    indexes: [String],
    before: RangeQuery,
    after: RangeQuery
  ): Long
  index: String!
}

input MetadataQuery {
  key: String!
  values: [String!]!
}

input LinkQuery {
  url: String
  origin: String
  paths: [String]
}

input BacklinkQuery {
  paths: [String]
  metadata: [MetadataQuery]
}

input RangeQuery {
  key: String!
  value: Long
  inclusive: Boolean
}

type Query {
  record(url: String!): Record
  records(
    search: String,
    origins: [String],
    excludeOrigins: [String],
    paths: [String],
    metadata: [MetadataQuery],
    links: LinkQuery,
    backlinks: BacklinkQuery,
    indexes: [String],
    before: RangeQuery,
    after: RangeQuery,
    sort: String,
    offset: Int,
    limit: Int,
    reverse: Boolean
  ): [Record]
  recordCount(
    search: String,
    origins: [String],
    excludeOrigins: [String],
    paths: [String],
    metadata: [MetadataQuery],
    links: LinkQuery,
    backlinks: BacklinkQuery,
    indexes: [String],
    before: RangeQuery,
    after: RangeQuery
  ): Long
  site(url: String!, cached: Boolean): Site
  sites(search: String, indexes: [String], writable: Boolean, offset: Int, limit: Int, reverse: Boolean): [Site]
}
`