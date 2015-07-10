#arteigenschaften.ch, Strukturanpassung

Neu ist v.a.:

- Taxonomien sind wie Eigenschaftensammlungen und Beziehungssammlungen ein Array
- Jede Taxonomie beschreibt in den Eigenschaften die hierarchiesche Position ihres Objekts

Vorläufig alte Strukturen belassen, bis:

- neue Applikation die alte ablöst
- Schnittstellen zu ALT und EvAB angepasst sind

### neue Struktur eines Objekts:

    _id
    _rev
    (Gruppe)
    Typ
    (Taxonomie)
    Taxonomien
      Name
      Beschreibung
      Datenstand
      Link
      Eigenschaften
        … (abhängig von der Taxonomie)
        Hierarchie
          Name
          GUID
    Eigenschaftensammlungen
    Beziehungssammlungen
