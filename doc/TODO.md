# Todo

Please feel free to open issues.

### basic ui

Basic browsing UI.

  - tabs
    - [ ] reordering
    - [ ] pinning
    - [ ] dropdown when there are too many?
  - webview behaviors
    - [ ] restore scroll-position on back btn [electron issue](https://github.com/electron/electron/issues/5884)
    - [ ] restore session history on "re-open closed tab" [electron issue](https://github.com/electron/electron/issues/5885)
  - bookmarking
    - [ ] store favicons
    - [ ] bookmark folders
    - [ ] editable titles
  - context menu
    - [ ] save image as...
    - [ ] video/audio element controls

### tests

 - [ ] beaker.fs tests

### dat integration

  - [ ] "Save dat archive..."
  - view-dat://
    - [ ] use the archive's dns name, if available
    - [ ] show item sizes
    - [ ] render README.md ?
  - expose dat API to applications

### ipfs integration

 - [ ] basic url scheme
 - [ ] expose ipfs api to applications

### privacy, security

Some basic necessities

 - [ ] block ads
 - [ ] incognito mode only. add opt-in 
 - [ ] try HTTPS before trying 
 - [ ] try to remove things that make fingerprinting possible
 - [ ] put webrtc (and other leaky apis) behind perms prompts

More advanced goals:

 - [ ] site version control (https://github.com/substack/hyperboot)
 - [ ] sandbox permission-trading: new features (such as FS access) are made available after other rights (such as XHR) are dropped

### user identity

something close to (if not cloned from) mozilla's persona project.
or, may consider using https://github.com/google/end-to-end.
should work across devices

 - [ ] naming/addressing (bob@foo.com ?)
 - [ ] key management, store secrets safely
 - [ ] look into supporting SSL client certificates

### peer-to-peer messaging layer

 - [ ] webrtc signalling. needs to integrate with user identity layer, so channels can be opened using another user's ID. (matrix protocol?)
 - [ ] mail protocol. SMTP? not sure.