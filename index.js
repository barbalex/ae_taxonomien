'use strict'

var couchPass = require('./couchPass.json')
var url = 'http://' + couchPass.user + ':' + couchPass.pass + '@127.0.0.1:5984'
var nano = require('nano')(url)
var adb = nano.db.use('artendb')
var _ = require('lodash')

adb.view('artendb', 'objekte', {
  'include_docs': true
}, function (err, body) {
  if (!err) {
    // extract object docs from result
    var docsArray = body.rows.map(function (row) {
      return row.doc
    })
    adb.view('artendb', 'dsMetadataNachDsName', {
      'include_docs': true
    }, function (err, body) {
      if (!err) {
        // extract metadata doc from result
        var taxMetadataArray = body.rows.map(function (row) {
          return row.doc
        })
        var taxMetadata = _.indexBy(taxMetadataArray, 'Name')

        var docs = []

        _.each(docsArray, function (doc) {
          if (doc.Gruppe && doc.Taxonomie && doc.Taxonomie.Eigenschaften) {
            var neueTax = _.cloneDeep(doc.Taxonomie)
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
              var hierarchie = []
              var metaData = taxMetadata[doc.Taxonomie.Name]
              if (metaData) {
                if (metaData.HierarchieFelder) {
                  _.forEach(metaData.HierarchieFelder, function (feld, index) {
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
          } else {
            console.log('doc ' + doc._id + ' has no Gruppe or no Taxonomie')
          }
        })

        // bulk-Format aufbauen
        var bulk = {}
        bulk.docs = docs

        // alle Updates in einem mal durchführen
        adb.bulk(bulk, function (error, result) {
          if (error) {
            console.log('error after bulk:', error)
          } else {
            console.log(docs.length + ' Objekte aktualisiert. Result from bulk:', result)
          }
        })
      } else {
        console.log('err: ', err)
      }
    })
  } else {
    console.log('err: ', err)
  }
})
