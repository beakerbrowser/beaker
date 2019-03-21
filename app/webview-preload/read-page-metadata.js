/**
 * This hack is used to fetch the page's metadata, eg when bookmarking
 * it's REALLY hacky to pollute the window namespace but oh well, I'm a man on a deadline
 * -prf
 */

import { getMetadata, metadataRuleSets } from 'page-metadata-parser'

// add rules which tolerate mis-labeled opengraph meta
// (og should use 'property' but often people use 'name')
metadataRuleSets.description.rules.push(['meta[name="og:description"]', element => element.getAttribute('content')])
metadataRuleSets.image.rules.push(['meta[name="og:image:secure_url"]', element => element.getAttribute('content')])
metadataRuleSets.image.rules.push(['meta[name="og:image:url"]', element => element.getAttribute('content')])
metadataRuleSets.image.rules.push(['meta[name="og:image"]', element => element.getAttribute('content')])
metadataRuleSets.image.rules.push(['meta[name="twitter:image"]', element => element.getAttribute('content')])
metadataRuleSets.title.rules.push(['meta[name="og:title"]', element => element.getAttribute('content')])
metadataRuleSets.type.rules.push(['meta[name="og:type"]', element => element.getAttribute('content')])
metadataRuleSets.url.rules.push(['meta[name="og:url"]', element => element.getAttribute('content')])
metadataRuleSets.provider.rules.push(['meta[name="og:site_name"]', element => element.getAttribute('content')])

Object.defineProperty(window, '__beakerGetPageMetadata', {
  value: () => {
    return getMetadata(window.document, window.location, metadataRuleSets)
  }
})