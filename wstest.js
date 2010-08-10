/*globals module test ok isObj equals expects Namespace */

// ............................................................................
//
// Origin of the Test Data
//
// This test uses data about a few birds, their official abbreviations, and 
// bird feeder observations for each bird in several regions of the United 
// States.
//
// Bird feeder observation data comes from Cornell University's Project Feeder 
// Watch (http://watch.birds.cornell.edu/PFW/ExploreData), with data taken
// from the top 25 birds in two regions, the south-central and southeastern 
// United States for the 2008-2009 season.
//
// Visit this link to see a map, and click for the regions to see the data in 
// list form:
//
//   http://www.birds.cornell.edu/pfw/DataRetrieval/Top25/2008-2009/Top25.htm
//
// Abbreviation codes for the birds involved were looked up at birdpop.org, 
// which has a dbf file with abbreviations:
// 
//   http://www.birdpop.org/AlphaCodes.htm
//
//   For each bird, there is a four-letter abbreviation, a six-letter 
//   abbreviation, and the same common name that is in the feederObservations.  
//
// ............................................................................

// ONRTest is used as a global container.
var ONRTest = SC.Object.create();

// ONRTest.BirdAppBase is here because if ONRTest.BirdApp = SC.Object.extend(.. 
// is used, the datasource will not instantiate properly. But if we use this 
// base object, the instantiation works...
ONRTest.BirdAppBase = SC.Object.extend({
  NAMESPACE: null,
  models: null,
  readyCall: null,
  queries: null,
  dataSource: null,
  store: null,
  start: null,
  test: null,
  finish: null
});

// Our simulated Sproutcore app, ONRTest.BirdApp:
ONRTest.BirdApp = ONRTest.BirdAppBase.create({
  // Simulating NAMESPACE for an SC app, set in core.js
  NAMESPACE: 'BirdApp',

  // Models in an SC app are stored as definitions in modelName.js files
  // in the models dir. They are instantiated by the system on startup.
  // Here we define the models as properties directly on our SC app, and
  // we will instantiate them in this.start(), keeping references to 
  // them in a hash called models.

  // The models hash; models will be instantiated in this.start(), and
  // references stored here.
  models: {},

  // References to records that will be created.
  birds: [],
  abbreviations: [],
  feederObservations: [],

  // Model definitions
  Abbreviation: SC.Record.extend({
    bucket: 'abbreviation',
    type:   SC.Record.attr(String),
    text:   SC.Record.attr(String),

    bird: SC.Record.toOne("ONRTest.BirdApp.Bird", 
                          { inverse: "abbreviations", isMaster: NO }),

    // A callback firing on status === READY_CLEAN
    _statusObs: function(){ 
      var status = this.get('status'); 
      if (status && status === SC.Record.READY_CLEAN){ 
        ONRTest.BirdApp.readyCall(this.get('storeKey')); 
      }
    }.observes('status')
  }),

  FeederObservation: SC.Record.extend({
    bucket:                     'feederObservation',
    season:                     SC.Record.attr(String),
    region:                     SC.Record.attr(String),
    rank:                       SC.Record.attr(Number),
    percentageOfFeedersVisited: SC.Record.attr(Number),
    meanGroupSizeWhenSeen:      SC.Record.attr(Number),
    feederwatchAbundanceIndex:  SC.Record.attr(Number),

    bird: SC.Record.toOne("ONRTest.BirdApp.Bird", 
                          { inverse: "feederObservations",
                            isMaster: NO }),

    // A callback firing on bird !=== undefined
    _birdObs: function(){ 
      var bird = this.get('bird'); 
      if (bird){ 
        ONRTest.BirdApp.birdSetCall(this.get('storeKey')); 
      }
    }.observes('bird'),

    // A callback firing on status === READY_CLEAN
    _statusObs: function(){ 
      var status = this.get('status'); 
      if (status && status === SC.Record.READY_CLEAN){ 
        ONRTest.BirdApp.readyCall(this.get('storeKey')); 
      }
    }.observes('status')
  }),

  Bird: SC.Record.extend({
    bucket:      'bird',
    commonName:  SC.Record.attr(String),
    genus:       SC.Record.attr(String),
    species:     SC.Record.attr(String),
  
    // computed property (recalculates when genus or species changes):
    scientificName: function(){
      return this.getEach('genus', 'species').compact().join(' ');
    }.property('genus', 'species').cacheable(),
    
    // relations:
    abbreviations:      SC.Record.toMany("ONRTest.BirdApp.Abbreviation", 
                                         { inverse: "bird", isMaster: YES }),
    feederObservations: SC.Record.toMany("ONRTest.BirdApp.FeederObservation", 
                                         { inverse: "bird", isMaster: YES }),

    _loadedObs: function(){
        console.log('ISLOADED: ' + this.get('isLoaded'));
        console.log('  abbreviations: ' + this.get('abbreviations').get('length'));
    }.observes('isLoaded'),

    // A callback firing on status === READY_CLEAN
    _statusObs: function(){ 
      var status = this.get('status'); 
      if (status && status === SC.Record.READY_CLEAN){ 
        ONRTest.BirdApp.readyCall(this.get('storeKey')); 
      }
    }.observes('status')

  }),

  // birdSetCall will fire when the bird reference is set in an abbreviation
  // or feederObservation.
  birdSetCall: function(storeKey){
    var recordType = SC.Store.recordTypeFor(storeKey);
    var id = ONRTest.BirdApp.store.idFor(storeKey);
    var statusString = ONRTest.BirdApp.store.statusString(storeKey);
    var rec = ONRTest.BirdApp.store.materializeRecord(storeKey);
    var bird = rec.get('bird');
    console.log('BIRD SET ' + recordType + '/' 
                            + id + '/' 
                            + statusString + '/' 
                            + bird.get('commonName'));
  },

  // readyCall will fire when the status of any record changes to READY_CLEAN.
  readyCall: function(storeKey){
    var recordType = SC.Store.recordTypeFor(storeKey);
    var id = ONRTest.BirdApp.store.idFor(storeKey);
    var statusString = ONRTest.BirdApp.store.statusString(storeKey);
    var rec = ONRTest.BirdApp.store.materializeRecord(storeKey);
    console.log(recordType + '/' + id + '/' + statusString);
    //console.log(JSON.stringify(ONRTest.BirdApp.store.readDataHash(storeKey)));
    var recordCount = ONRTest.BirdApp.get('recordCount');
    ONRTest.BirdApp.set('recordCount', recordCount+1);
    if (recordType === ONRTest.BirdApp.Bird){
      console.log('ABBREVIATIONS');
      var abbreviations = rec.get('abbreviations');
      for (var i=0,len=abbreviations.length; i<len; i++){
        console.log(abbreviations[i].get('text'));
      }
      var feederObservations = rec.get('feederObservations');
      console.log('FEEDER OBSERVATIONS');
      for (i=0,len=feederObservations.length; i<len; i++){
        console.log(feederObservations[i].get('region'));
      }
    }
    else {
      console.log('BIRD');
      var bird = rec.get('bird');
      if (bird) console.log(bird.get('commonName'));
    }
  },

  // For storing queries that would be defined in core.js
  queries: {},

  // For controllers that would be in controllers dir
  controllers: {},

  // For datasource that would be in data_sources dir
  dataSource: SC.OrionNodeRiakDataSource.extend({
    authSuccessCallback: function(){
      ONRTest.BirdApp.test();
    }
  }),

  // For the store, that would be defined in core.js
  store: SC.Store.create({
    commitRecordsAutomatically: YES
  }).from('ONRTest.BirdApp.dataSource'),

  // A count of all records created in the test that have been
  // marked READY_CLEAN.
  recordCount: 0,

  // An observer of the total number of records created.
  recordsDidLoad: function(){
    console.log('recordCount: ' + ONRTest.BirdApp.recordCount);
    if (ONRTest.BirdApp.recordCount === 13) ONRTest.BirdApp.finish();
  }.observes('recordCount'),

  start: function(){
    // 
    // This function is called by ONRTest.start(), which is called on loading 
    // of index.html.
    //
    // At this point:
    //
    //   - this.dataSource has authSuccessCallback set to come to this.test().
    //
    // Things to do here:
    //
    //   - Instantiate the models.
    //   - Force instantiation of the store.
    //   - Make the websocket connection.
    //   - Create queries, controllers, etc.
    //
    console.log("STARTING BirdApp");
    console.log("INSTANTIATING models, store");

    // Instantiate models, keeping references in this.models
    this.models['abbreviation'] = this.Abbreviation();
    this.models['feederObservation'] = this.FeederObservation();
    this.models['bird'] = this.Bird();

    // Create the data source if it doesn't exist already. (FORCE)
    var initDS = this.store._getDataSource(); 

    // Call auth. The data source contains a callback to the test() function.
    this.store.dataSource.wsConnect(ONRTest.BirdApp.store,function(){ 
      ONRTest.BirdApp.store.dataSource.authRequest("test","test");
    });

    // Create queries for later use, as would be done in core.js of a 
    // Sproutcore app.
    this.queries['abbreviation'] = {};
    this.queries['abbreviation']['all'] = SC.Query.create({
      recordType: ONRTest.BirdApp.Abbreviation
    });

    this.queries['feederObservation'] = {};
    this.queries['feederObservation']['all'] = SC.Query.create({
      recordType: ONRTest.BirdApp.FeederObservation
    });
    
    this.queries['bird'] = {};
    this.queries['bird']['all'] = SC.Query.create({
      recordType: ONRTest.BirdApp.Bird
    });
    this.queries['bird']['Kinglet'] = SC.Query.create({ 
      conditions: "genus = {gn_ltrs} AND commonName CONTAINS {ltrs}", 
      parameters: { gn_ltrs:"Regulus", ltrs:"Kinglet"},
      recordType: ONRTest.BirdApp.Bird
    });
    this.queries['bird']['Finch'] = SC.Query.create({ 
      conditions: "genus = {gn_ltrs} AND commonName CONTAINS {ltrs}", 
      parameters: { gn_ltrs:"Carpodacus", ltrs:"Finch"},
      recordType: ONRTest.BirdApp.Bird
    });

    // Create the controllers.
    this.controllers['feederObservation'] = SC.ArrayController.create({
      addFeederObservation: function(args){
        var season                     = args['season'],
            region                     = args['region'],
            rank                       = args['rank'],
            percentageOfFeedersVisited = args['percentageOfFeedersVisited'],
            meanGroupSizeWhenSeen      = args['meanGroupSizeWhenSeen'],
            feederwatchAbundanceIndex  = args['feederwatchAbundanceIndex'];

        var feederObservation;
    
        // Create a new feederObservation in the store.
        feederObservation = ONRTest.BirdApp.store.createRecord(ONRTest.BirdApp.FeederObservation, {
          "season":                     season,
          "region":                     region,
          "rank":                       rank,
          "percentageOfFeedersVisited": percentageOfFeedersVisited,
          "meanGroupSizeWhenSeen":      meanGroupSizeWhenSeen,
          "feederwatchAbundanceIndex":  feederwatchAbundanceIndex
        });
    
        return feederObservation;
      }
    });

    this.controllers['abbreviation'] = SC.ArrayController.create({
      addAbbreviation: function(args){
        var type = args['type'],
            text = args['text'];

        var abbreviation;

        // Create a new abbreviation in the store.
        abbreviation = ONRTest.BirdApp.store.createRecord(ONRTest.BirdApp.Abbreviation, {
          "type": type,
          "text": text
        });
    
        return abbreviation;
      }
    });

    this.controllers['bird'] = SC.ArrayController.create({
      addBird: function(args){
        var commonName = args['commonName'];
        var genus      = args['genus'];
        var species    = args['species'];

        var bird;

        // Create a new bird in the store.
        bird = ONRTest.BirdApp.store.createRecord(ONRTest.BirdApp.Bird, {
          "commonName": commonName,
          "genus":      genus,
          "species":    species
        });
    
        return bird;
      }
    });
  },
         
  test: function(){
    //
    // Data for birds, feeder observations, and abbreviations were
    // put into hashes to allow convenient creation of data by looping 
    // through calls to controllers.
    //
    var data = [
      {commonName: "Eastern Towhee", 
       taxonomy: {genus: "Pipilo", species: "erythrophthalmus"},
       feederObservations: [{season: "2008-2009", 
                             region: "Southeastern US", 
                             rank: 17, 
                             percentageOfFeedersVisited: 49.60, 
                             meanGroupSizeWhenSeen: 1.49, 
                             feederwatchAbundanceIndex: 0.25}],
       abbreviations: [{type: 'fourLetter', text: "EATO"}, 
                       {type: 'sixLetter', text: "PIPERP"}]},
      {commonName: "House Finch", 
       taxonomy: {genus: "Carpodacus", species: "mexicanus"},
       feederObservations: [{season: "2008-2009",        // Two for House Finch
                             region: "Southeastern US", 
                             rank: 8, 
                             percentageOfFeedersVisited: 74.17, 
                             meanGroupSizeWhenSeen: 3.38, 
                             feederwatchAbundanceIndex: 1.32},
                            {season: "2008-2009", 
                             region: "South Central US", 
                             rank: 6, 
                             percentageOfFeedersVisited: 75.37, 
                             meanGroupSizeWhenSeen: 3.58, 
                             feederwatchAbundanceIndex: 1.23}],
       abbreviations: [{type: 'fourLetter', text: "HOFI"}, 
                       {type: 'sixLetter', text: "CARMEX"}]},
      {commonName: "Ruby-crowned Kinglet",
       taxonomy: {genus: "Regulus", species: "calendula"},
       feederObservations: [{season: "2008-2009", 
                             region: "South Central US", 
                             rank: 22, 
                             percentageOfFeedersVisited: 39.76, 
                             meanGroupSizeWhenSeen: 1.17, 
                             feederwatchAbundanceIndex: 0.14}],
       abbreviations: [{type: 'fourLetter', text: "RCKI"}, 
                       {type: 'sixLetter', text: "REGCAL"}]}];
    //
    // Each item in the data contains information about a single
    // bird.  Calls are made to the controllers, to the respective 
    // addBird(), addFeederObservation(), and addAbbreviation() functions, 
    // which make createRecord requests.
    //
    // In the models, Bird is the master, having toMany relations with
    // the Abbreviation and FeederObservation. The inverse is that each
    // abbreviation and feederObservation has a bird reference.
    //
    // As these createRecord requests are made, relations are set up by
    // getting the property in each inverse relation, and setting records.
    //
    // A simple list of records created is kept, so we can know when all
    // have been created, before continuing with test operations.
    //
    //     In this test, 3 birds, 4 feederOperations, and 6 abbreviations
    //     will be created, for a total of 13 records.
    //
    for (var i=0,len=data.length; i<len; i++){
      var commonName         = data[i]['commonName'];
      var taxonomy           = data[i]['taxonomy'];
      var feederObservations = data[i]['feederObservations'];
      var abbreviations      = data[i]['abbreviations'];

      var bird = this.controllers['bird'].addBird({
        commonName: commonName,
        genus:      taxonomy.genus,
        species:    taxonomy.species
      });

      this.birds.push(bird);

      for (var j=0,len2=feederObservations.length; j<len2; j++){
        var feederObservation = this.controllers['feederObservation'].addFeederObservation({
          season:                     feederObservations[j].season,
          region:                     feederObservations[j].region,
          rank:                       feederObservations[j].rank,
          percentageOfFeedersVisited: feederObservations[j].percentageOfFeedersVisited,
          meanGroupSizeWhenSeen:      feederObservations[j].meanGroupSizeWhenSeen,
          feederwatchAbundanceIndex:  feederObservations[j].feederwatchAbundanceIndex
        });
        this.feederObservations.push(feederObservation);
        feederObservation.set('bird', bird);
        var feederObservationsInBird = bird.get('feederObservations');
        feederObservationsInBird.pushObject(feederObservation);
      }

      for (var k=0,len3=abbreviations.length; k<len3; k++){
        var abbreviation = this.controllers['abbreviation'].addAbbreviation({
          type: abbreviations[k].type,
          text:  abbreviations[k].text
        });
        this.abbreviations.push(abbreviation);
        abbreviation.set('bird', bird);
        var abbreviationsInBird = bird.get('abbreviations');
        abbreviationsInBird.pushObject(abbreviation);
      }
    }
  },

//  checkBirds: function(){
//    console.log('in CHECKBIRDS');
//    for (var i=0,len=ONRTest.BirdApp.birds.length; i<len; i++){
//      if (ONRTest.BirdApp.birds[i].isLoaded){
//        console.log(ONRTest.BirdApp.birds[i].get('commonName'));
//        console.log('  Abbreviations:');
//        for (var j=0,length=ONRTest.BirdApp.birds[i].abbreviations.length; j<length; j++){
//          console.log('    ' + ONRTest.BirdApp.birds[i].abbreviations[j].get('text'));
//        }
//        console.log('  Feeder Observations:');
//        for (j=0,length=ONRTest.BirdApp.birds[i].feederObservations.length; j<length; j++){
//          console.log('    ' + ONRTest.BirdApp.birds[i].feederObservations[j].get('region'));
//        }
//      }
//    }
//  }.observes(bird.isLoaded),

  // 
  // Tear-down
  //
  finish: function(){
    console.log('FINISHING');
  }
});

ONRTest.start = function(){
  console.log("STARTING CLIENTS");

  this.clients = {};
  //this.clients['FetchKinglet'] = ONRTest.BirdApp;
  //this.clients['FetchFinch'] = ONRTest.BirdApp;
  this.clients['BirdApp'] = ONRTest.BirdApp;

  for (var clientName in ONRTest.clients){
    ONRTest.clients[clientName].start();
  }
};

