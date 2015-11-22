'use strict'

const couchPass = require('./couchPass.json')
const url = `http://${couchPass.user}:${couchPass.pass}@127.0.0.1:5984`
const nano = require('nano')(url)
const aeDb = nano.db.use('ae')
const _ = require('lodash')

let docsWritten = 0

function bulkSave (docs) {
  let bulk = {}
  bulk.docs = docs
  aeDb.bulk(bulk, function (error, result) {
    if (error) return console.log('error after bulk:', error)
    docsWritten = docsWritten + docs.length
    console.log('docsWritten', docsWritten)
  })
}

aeDb.view('artendb', 'objekte', {
  'include_docs': true
}, (error, body) => {
  if (error) return console.log(error)
  aeDb.view('artendb', 'dsMetadataNachDsName', {
    'include_docs': true
  }, function (err, body) {
    if (err) return console.log(err)
    // extract metadata doc from result
    const taxMetadataArray = body.rows.map((row) => row.doc)
    const taxMetadata = _.indexBy(taxMetadataArray, 'Name')

    let docs = []
    let docsPrepared = 0

    // loop through docs
    body.rows.forEach((row, index) => {
      const doc = row.doc
      if (doc.Gruppe && doc.Taxonomie && doc.Taxonomie.Eigenschaften) {
        let neueTax = _.cloneDeep(doc.Taxonomie)
        if (doc.Gruppe === 'Lebensräume' && neueTax.Eigenschaften.Parent) {
          if (!neueTax.Eigenschaften.Parent) {
            console.log('lr ' + doc._id + ' hat keinen Parent')
          } else if (!neueTax.Eigenschaften.Hierarchie) {
            console.log('lr ' + doc._id + ' hat keine Hierarchie')
          } else {
            delete neueTax.Eigenschaften.Parent
          }
        } else {
          // this is a species
          let hierarchie = []
          const metaData = taxMetadata[doc.Taxonomie.Name]
          if (metaData) {
            if (metaData.HierarchieFelder) {
              _.forEach(metaData.HierarchieFelder, (feld, index) => {
                if (neueTax.Eigenschaften[feld]) {
                  if (index + 1 === metaData.HierarchieFelder.length) {
                    hierarchie.push({
                      'Name': neueTax.Eigenschaften['Artname vollständig'],
                      'GUID': doc._id
                    })
                  } else {
                    hierarchie.push({
                      'Name': neueTax.Eigenschaften[feld]
                    })
                  }
                }
              })
              neueTax.Eigenschaften.Hierarchie = hierarchie
            }
          } else {
            console.log('doc ' + doc._id + ' has no metaData')
          }
        }
        neueTax.Eigenschaften = neueTax.Eigenschaften
        doc.Taxonomien = [neueTax]
        docs.push(doc)

        if ((docs.length > 600) || (index === body.rows.length - 1)) {
          docsPrepared = docsPrepared + docs.length
          console.log('docsPrepared', docsPrepared)
          // save 600 docs
          bulkSave(docs.splice(0, 600))
        }
      } else {
        console.log('doc ' + doc._id + ' has no Gruppe or no Taxonomie')
      }
    })
  })
})
