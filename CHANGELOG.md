# Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]
### Changed
- Restyled Browser UI
- Dat protocol: if index.html does not exist, but the archive was found, will now render the view-dat interface

### Fixed
- Fixed mimetype lookups when a file isnt identifiable by a magic number
- Fixed a bug that caused failed subresource fetches to register as a failed page-load