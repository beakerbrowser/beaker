export default {
  '$schema': 'http://json-schema.org/draft-07/schema#',
  '$id': 'dat://unwalled.garden/status.json',
  'type': 'object',
  'title': 'Status',
  'description': 'A broadcasted piece of content.',
  'required': ['type', 'body', 'createdAt'],
  'properties': {
    'type': {
      'type': 'string',
      'description': "The object's type",
      'const': 'unwalled.garden/status'
    },
    'body': {
      'type': 'string',
      'description': "The status's text body",
      'maxLength': 1000000
    },
    'createdAt': {
      'type': 'string',
      'format': 'date-time',
      'description': "The time of this status's creation"
    },
    'updatedAt': {
      'type': 'string',
      'format': 'date-time',
      'description': "The time of this status's last edit"
    }
  }
}