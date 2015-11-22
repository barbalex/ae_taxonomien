'use strict'

/*
 * Objekt neu aufbauen
 * damit die Reihenfolge passt und die Taxonomie die Gruppe enthält
 * Reihenfolge:
 * 1. Taxonomie
 * 2. Taxonomien
 * 3. Eigenschaftensammlungen
 * 4. Beziehungssammlungen
 */

const couchPass = require('./couchPass.json')
const url = `http://${couchPass.user}:${couchPass.pass}@127.0.0.1:5984`
const nano = require('nano')(url)
const aeDb = nano.db.use('ae')
const _ = require('lodash')

const hierarchyFieldsOfGroups = {
  Fauna: ['Klasse', 'Ordnung', 'Familie', 'Gattung'],
  Flora: ['Familie', 'Gattung'],
  Moose: ['Klasse', 'Familie', 'Gattung'],
  Macromycetes: ['Gattung']
}

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

aeDb.view('objects', 'objects', {
  'include_docs': true
}, (error, body) => {
  if (error) return console.log(error)

  let docs = []
  let docsPrepared = 0

  // loop through docs
  body.rows.forEach((row, index) => {
    const doc = row.doc
    if (doc.Gruppe && doc.Taxonomie && doc.Taxonomie.Eigenschaften) {
      let neueTax = _.cloneDeep(doc.Taxonomie)
      if (doc.Gruppe === 'Lebensräume' && neueTax.Eigenschaften.Parent) {
        // lr: remove parent. Only keep Hierarchie
        if (!neueTax.Eigenschaften.Parent) {
          console.log('lr ' + doc._id + ' hat keinen Parent')
        } else if (!neueTax.Eigenschaften.Hierarchie) {
          console.log('lr ' + doc._id + ' hat keine Hierarchie')
        } else {
          delete neueTax.Eigenschaften.Parent
        }
      } else {
        // this is a species
        // need to build Hierarchie
        let hierarchy = []
        const metaData = hierarchyFieldsOfGroups[doc.Gruppe]
        if (metaData && metaData.hierarchyFields) {
          const hierarchyFields = metaData.hierarchyFields
          hierarchyFields.forEach((field, index) => {
            if (neueTax.Eigenschaften[field]) {
              if (index + 1 === hierarchyFields.length) {
                hierarchy.push({
                  'Name': neueTax.Eigenschaften['Artname vollständig'],
                  'GUID': doc._id
                })
              } else {
                hierarchy.push({
                  'Name': neueTax.Eigenschaften[field]
                })
              }
            }
          })
          neueTax.Eigenschaften.Hierarchie = hierarchy
        } else {
          console.log('doc ' + doc._id + ' has no metaData')
        }
      }
      // set this taxonomy as standard
      neueTax.Standardtaxonomie = true
      // now manipulate order of properties
      // first clone es and bs
      const newEs = _.cloneDeep(doc.Eigenschaftensammlungen)
      const newBs = _.cloneDeep(doc.Beziehungssammlungen)
      // remove old versions
      delete doc.Taxonomie
      if (doc.Eigenschaftensammlungen) delete doc.Eigenschaftensammlungen
      if (doc.Beziehungssammlungen) delete doc.Beziehungssammlungen
      // now add in wanted order
      doc.Taxonomien = [neueTax]
      doc.Eigenschaftensammlungen = newEs
      doc.Beziehungssammlungen = newBs

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
