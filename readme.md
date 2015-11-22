#arteigenschaften.ch, Strukturanpassung

Neu ist v.a.:

- Taxonomien sind wie Eigenschaftensammlungen und Beziehungssammlungen ein Array
- Jede Taxonomie beschreibt in den Eigenschaften die hierarchische Position ihres Objekts

### neue Struktur eines Objekts:

    _id
    _rev
    Gruppe
    Typ
    Taxonomien
      Name
      Beschreibung
      Datenstand
      Link
      Standardtaxonomie
      Eigenschaften
        … (abhängig von der Taxonomie)
        Hierarchie
          Name
          GUID
    Eigenschaftensammlungen
    Beziehungssammlungen
