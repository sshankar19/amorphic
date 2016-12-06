var expect = require('chai').expect;
var request = require('request');
var axios = require('axios');
var path = require('path');
var fs = require('fs');

// This module emulates XMLHTTPRequest for the benefit of client.js which uses it to communicate with the server
var xhrc = require("xmlhttprequest-cookie");
XMLHttpRequest = xhrc.XMLHttpRequest;
var CookieJar = xhrc.CookieJar;

// Copy index.js (amorphic) into it's rightful place in node_modules so it will be found

// The root must be test since amorphic depends on this to find app

// Fire up amorphic as the server

// Create global variables for the benefit of client.js
PostCallAssert = function () {}
ObjectTemplate = require('supertype');
RemoteObjectTemplate = require('semotus')._createObject();
RemoteObjectTemplate.role = "client";
RemoteObjectTemplate._useGettersSetters = false;
Q = require("q");
_ = require("underscore");
__ver = 0;
document = {body: null, write: function (content) {}};
alert= function (msg) {console.log("alert " + content);}
clientController = null;

var modelRequires;
var controllerRequires
var serverAmorphic = require('../../index.js');

// Fire up amrophic as the client
require('../../client.js');

function afterEachDescribe(done) {
    serverAmorphic.reset().then(function () {
        done()
    });
}
function beforeEachDescribe(done, createControllerFor, sourceMode) {
    process.env.createControllerFor = createControllerFor;
    process.env.sourceMode = sourceMode || 'debug';
    serverAmorphic.listen(__dirname +'/');
    modelRequires = require('./apps/test/public/js/model.js').model(RemoteObjectTemplate, function () {});
    controllerRequires = require('./apps/test/public/js/controller.js').controller(RemoteObjectTemplate , function () {
        return modelRequires;
    });
    Controller = controllerRequires.Controller;
    window = modelRequires;
    window.Controller = controllerRequires.Controller;
    var isDone = false;

    request("http://localhost:3001/amorphic/init/test.js", function (error, response, body) {
        if (!error && response.statusCode == 200) {
            try {
                eval(body);

                amorphic.addEvent = function () {} ; // mock
                amorphic.prepareFileUpload = function () {} //mock
                amorphic._zombieCheck = function () {} //mock
                amorphic.setCookie = function () {} // mock
                amorphic.initializationData.url = "http://localhost:3001" + amorphic.initializationData.url;
                amorphic.establishClientSession(
                    "Controller", __ver,
                    function (newController, sessionExpiration) {
                        if (clientController && typeof(clientController.shutdown) == "function")
                            clientController.shutdown();
                        clientController = newController;
                        if (typeof(clientController.clientInit) == "function")
                            clientController.clientInit(sessionExpiration);
                        if (!isDone) {
                            isDone = true;
                            done();
                        }
                    },
                    function (hadChanges) {
                    },

                    // When a new version is detected pop up "about to be refreshed" and
                    // then reload the document after 5 seconds.
                    function () {
                        clientController.amorphicStatus = 'reloading';
                    },

                    // If communication lost pop up dialog
                    function () {
                        controller.amorphicStatus = 'offline';
                    }
                );
            } catch (e) {done(e)};
        }

    });
}

describe("First Group of Tests", function () {
    this.timeout(1000000);
    before(beforeEachDescribe);
    after(afterEachDescribe);

    it("clears the bank and saves everything", function (done) {
        serverAssert = function (count) {
            expect(count).to.equal(0);
            serverController.sam.roles[0].account.listTransactions();
            serverController.sam.roles[1].account.listTransactions();
            expect(serverController.sam.roles[0].account.getBalance() +
                   serverController.sam.roles[1].account.getBalance()).to.equal(225);
            expect(serverController.preServerCallObjects['Controller']).to.equal(true);
        }
        clientController.clearDB().then(function () {
            done();
        }).fail(function(e) {
            done(e)
        });
    });

    it("fetch everything back", function (done) {
        serverAssert = function () {
            serverController.sam.roles[0].account.listTransactions();
            serverController.sam.roles[1].account.listTransactions();
            expect(serverController.sam.roles[0].account.getBalance() +
                   serverController.sam.roles[1].account.getBalance()).to.equal(225);
            expect(serverController.preServerCallObjects['Controller']).to.equal(true);
        }
        clientController.mainFunc().then(function () {
            expect(serverController.sam.roles[0].account.getBalance() +
                serverController.sam.roles[1].account.getBalance()).to.equal(225);
            expect(serverController.preServerCallObjects['Controller']).to.equal(true);
            done();
        }).fail(function(e) {
             done(e)
        });
    });
    it("change results on server", function (done) {
        serverAssert = function () {
            serverController.sam.roles[0].account.transactions[0].amount += 1;
            serverController.version = serverController.sam.roles[0].account.__version__;
        }
        PostCallAssert = function () {
            expect(serverController.__template__.__objectTemplate__.currentTransaction.touchObjects[serverController.sam.roles[0].account.__id__])
                .to.equal(serverController.sam.roles[0].account);
            console.log("foo");
        }
        clientController.mainFunc().then(function () {
            expect(serverController.sam.roles[0].account.getBalance() +
                   serverController.sam.roles[1].account.getBalance()).to.equal(226);
            done();
        }).fail(function(e) {
            done(e)
        });
    });

    it("throw an execption", function (done) {
        serverAssert = function () {
            throw "get stuffed";
        }
        PostCallAssert = function () {
        }
        clientController.mainFunc()
            .then(function () {
                expect("Should not be here").to.equal(false);
            }, function (e) {
                expect(e.message).to.equal("get stuffed");
                done()
            }).fail(function(e) {
                done(e)
            });
    });

    it("can get it's data freshened", function (done) {
        serverAssert = function () {
            expect(serverController.sam.roles[0].account.__version__ * 1).to.equal(serverController.version * 1 + 1);
            expect(serverController.sam.firstName).to.equal("Sammy");
        }
        var knex = serverController.__template__.objectTemplate.getDB('__default__').connection;
        Q().then(function () {
            return knex('customer').where({'_id': serverController.sam._id}).update({'firstName': 'Sammy', '__version__': 100})
        }).then(function () {
            return clientController.mainFunc()
        }).then( function () {
            expect(clientController.sam.firstName).to.equal("Sammy");
            done();
        }).fail(function(e) {
            done(e)
        });
    });
    it("can retry an update conflict", function (done) {
        var retryCount = 0;
        this.timeout(4000);
        serverAssert = function () {
            console.log("Updating Sam and then changing verions to 200 " + retryCount);
            serverController.sam.firstName = 'Sam';
            ++retryCount;
            return knex('customer').where({'_id': serverController.sam._id}).update({'__version__': 200, lastName: 'The Man'})
        }
        var knex = serverController.__template__.objectTemplate.getDB('__default__').connection;
        Q().then(function () {
            return clientController.mainFunc()
        }).then( function () {
            expect(clientController.sam.firstName).to.equal("Sam");
            expect(clientController.sam.lastName).to.equal("The Man");
            expect(retryCount).to.equal(2);
            done();
        }).fail(function(e) {
            done(e)
        });
    });

    it("can do a resetSession", function (done) {
        clientController.conflictData = 'foo';
        Q().then(function () {
            console.log('are we getting here');
            serverAssert = function () {expect(serverController.conflictData).to.equal('foo')}
            return clientController.mainFunc();
        }).then(function () {
            console.log('are we getting here2');
            amorphic.resetSession();
            return clientController.mainFunc();
        }).then(function () {
            expect("Should not be here").to.equal(false);
        }, function (e) {
            serverAssert = function () {expect(serverController.conflictData).to.equal('initial')}
            return clientController.mainFunc();
        }).then(function () {
            expect(clientController.conflictData).to.equal('initial');
            done()
        }).fail(function(e) {
            done(e instanceof Error ? e : new Error(JSON.stringify(e)))
        });
    });

    it("can get a synchronization error", function (done) {
        serverAssert = function () {
            expect(serverController.conflictData).to.equal('foo');
        }
        clientController.conflictData = 'foo';
        Q().then(function () {
            return clientController.mainFunc();
        }).then(function () {
            expect("Should not be here").to.equal(false);
        }, function (e) {
            expect(e.text).to.equal("An internal error occured");
            serverAssert = function () {expect(serverController.conflictData).to.equal('foo');}
            return clientController.mainFunc();  // Next call will fail too because it gets a sync
        }).then(function () {
            expect(clientController.conflictData).to.equal('foo');
            done()
        }).fail(function(e) {
            if (e.code == 'reset')
                done();
            else
                done(e instanceof Error ? e : new Error(JSON.stringify(e)))
        });
        serverController.conflictData = 'bar';

    });
    it("change results on server", function (done) {
        var version;
        serverAssert = function () {
            serverController.sam.roles[0].account.transactions[0].amount += 1;
            serverController.version = serverController.sam.roles[0].account.__version__;
        }
        PostCallAssert = function () {
            expect(serverController.__template__.__objectTemplate__.currentTransaction.touchObjects[serverController.sam.roles[0].account.__id__])
                .to.equal(serverController.sam.roles[0].account);
            console.log("foo");
        }
        clientController.mainFunc().then(function () {
            expect(serverController.sam.roles[0].account.getBalance() +
                serverController.sam.roles[1].account.getBalance()).to.equal(226);
            PostCallAssert = function () {}
            done();
        }).fail(function(e) {
            PostCallAssert = function () {}
            done(e)
        });
    });
});

describe("Second Group of Tests", function () {
    before(beforeEachDescribe);
    after(afterEachDescribe);
    it ("clears the bank and saves everything", function (done) {
        serverAssert = function (count) {
            expect(count).to.equal(0);
            serverController.sam.roles[0].account.listTransactions();
            serverController.sam.roles[1].account.listTransactions();
            expect(serverController.sam.roles[0].account.getBalance() +
                serverController.sam.roles[1].account.getBalance()).to.equal(225);
            expect(serverController.preServerCallObjects['Controller']).to.equal(true);
        }
        clientController.clearDB().then(function () {
            done();
        }).fail(function(e) {
            done(e)
        });
    });

    it("fetch everything back", function (done) {
        serverAssert = function () {
            serverController.sam.roles[0].account.listTransactions();
            serverController.sam.roles[1].account.listTransactions();
            expect(serverController.sam.roles[0].account.getBalance() +
                serverController.sam.roles[1].account.getBalance()).to.equal(225);
            expect(serverController.preServerCallObjects['Controller']).to.equal(true);
        }
        clientController.mainFunc().then(function () {
            expect(serverController.sam.roles[0].account.getBalance() +
                serverController.sam.roles[1].account.getBalance()).to.equal(225);
            expect(serverController.preServerCallObjects['Controller']).to.equal(true);
            done();
        }).fail(function(e) {
            done(e)
        });
    });
    it("change results on server", function (done) {
        var version;
        serverAssert = function () {
            serverController.sam.roles[0].account.transactions[0].amount += 1;
            serverController.version = serverController.sam.roles[0].account.__version__;
        }
        PostCallAssert = function () {
            expect(serverController.__template__.__objectTemplate__.currentTransaction.touchObjects[serverController.sam.roles[0].account.__id__])
                .to.equal(serverController.sam.roles[0].account);
            console.log("foo");
        }
        clientController.mainFunc().then(function () {
            expect(serverController.sam.roles[0].account.getBalance() +
                serverController.sam.roles[1].account.getBalance()).to.equal(226);
            done();
        }).fail(function(e) {
            done(e)
        });
    });
    it("throw an execption", function (done) {
        serverAssert = function () {
            throw "get stuffed";
        }
        PostCallAssert = function () {
        }
        clientController.mainFunc()
            .then(function () {
                expect("Should not be here").to.equal(false);
            }, function (e) {
                expect(e.message).to.equal("get stuffed");
                done()
            }).fail(function(e) {
            done(e)
        });
    });

    it("can get it's data freshened", function (done) {
        serverAssert = function () {
            expect(serverController.sam.roles[0].account.__version__ * 1).to.equal(serverController.version * 1 + 1);
            expect(serverController.sam.firstName).to.equal("Sammy");
        }
        var knex = serverController.__template__.objectTemplate.getDB('__default__').connection;
        Q().then(function () {
            return knex('customer').where({'_id': serverController.sam._id}).update({'firstName': 'Sammy', '__version__': 100})
        }).then(function () {
            return clientController.mainFunc()
        }).then( function () {
            expect(clientController.sam.firstName).to.equal("Sammy");
            done();
        }).fail(function(e) {
            done(e)
        });
    });
    it("can retry an update conflict", function (done) {
        var retryCount = 0;
        this.timeout(4000);
        serverAssert = function () {
            console.log("Updating Sam and then changing verions to 200 " + retryCount);
            serverController.sam.firstName = 'Sam';
            ++retryCount;
            return knex('customer').where({'_id': serverController.sam._id}).update({'__version__': 200, lastName: 'The Man'})
        }
        var knex = serverController.__template__.objectTemplate.getDB('__default__').connection;
        Q().then(function () {
            return clientController.mainFunc()
        }).then( function () {
            expect(clientController.sam.firstName).to.equal("Sam");
            expect(clientController.sam.lastName).to.equal("The Man");
            expect(retryCount).to.equal(2);
            done();
        }).fail(function(e) {
            done(e)
        });
    });
    it("can do a resetSession", function () {
        clientController.conflictData = 'foo';
        return Q().then(function () {
            serverAssert = function () {
                expect(serverController.conflictData).to.equal('foo');
            }
            return clientController.mainFunc();
        }).then(function () {
            amorphic.resetSession();
            serverAssert = function() {
                expect(serverController.conflictData).to.equal('initial');
            }
            return clientController.mainFunc().catch(function(e) {
                expect(e.code).to.equal('reset');
                expect(e.text).to.equal('Session resynchronized');
                expect(clientController.conflictData).to.equal('initial');
                return clientController.mainFunc();
            });
        }).then(function () {
            expect(clientController.conflictData).to.equal('initial');
        });
    });

    it("can get a synchronization error", function (done) {
        serverAssert = function () {
            expect(serverController.conflictData).to.equal('foo');
        }
        clientController.conflictData = 'foo';
        Q().then(function () {
            return clientController.mainFunc();
        }).then(function () {
            expect("Should not be here").to.equal(false);
        }, function (e) {
            expect(e.text).to.equal("An internal error occured");
            serverAssert = function () {expect(serverController.conflictData).to.equal('foo');}
            return clientController.mainFunc();  // Next call will fail too because it gets a sync
        }).then(function () {
            expect(clientController.conflictData).to.equal('foo');
            done()
        }).fail(function(e) {
            if (e.code == 'reset')
                done();
            else
                done(e instanceof Error ? e : new Error(JSON.stringify(e)))
        });
        serverController.conflictData = 'bar';
    });
    it("change results on server", function (done) {
        var version;
        serverAssert = function () {
            serverController.sam.roles[0].account.transactions[0].amount += 1;
            serverController.version = serverController.sam.roles[0].account.__version__;
        }
        PostCallAssert = function () {
            expect(serverController.__template__.__objectTemplate__.currentTransaction.touchObjects[serverController.sam.roles[0].account.__id__])
                .to.equal(serverController.sam.roles[0].account);
            console.log("foo");
        }
        clientController.mainFunc().then(function () {
            expect(serverController.sam.roles[0].account.getBalance() +
                serverController.sam.roles[1].account.getBalance()).to.equal(226);
            done();
        }).fail(function(e) {
            done(e)
        });
    });

    //Internal Routes (aka used by client.js)
    it('should ignore a non-sequenced post message', function() {
        return axios({
            method: 'post',
            url: 'http://localhost:3001/amorphic/xhr?path=test',
            data: {
                key:'value'
            },
            validateStatus: function (status) {
                return true;
            }
        }).then(function(res) {
            expect(res.status).to.equal(500);
            expect(res.data).to.equal('ignoring non-sequenced message');
        });
    });

    it('should establish a session for a request with a sequnce number in the payload', function () {
        return axios({
            method: 'post',
            url: 'http://localhost:3001/amorphic/xhr?path=test',
            data: {
                sequence: 1
            },
            validateStatus: function (status) {
                return true;
            }
        }).then(function (res) {
            expect(res.status).to.equal(200);
            expect(res.data.changes).to.equal('{"server-Controller-1":{"conflictData":[null,"initial"],"someData":[null,"A"],"sam":[null,null],"karen":[null,null],"ashling":[null,null],"updatedCount":[null,0]}}');
        });
    });

    it('should throw an error if you are making a request to a non registered app', function() {
        return axios({
            method: 'post',
            url: 'http://localhost:3001/amorphic/xhr?path=error',
            data: {
                sequence: 1
            },
            validateStatus: function (status) {
                return true;
            }
        }).then(function(res) {
            //TODO: Add a test later for the specific res.data message being sent back unfortunately that is currently a server stack trace
            expect(res.status).to.equal(500);
            expect(res.statusText).to.equal('Internal Server Error');
        });
    });

    it('should not be able to process a post from xhr request if no processPost function is defined', function() {
        return axios({
            method: 'post',
            url: 'http://localhost:3001/amorphic/xhr?path=test&form=true',
            data: {
                sequence: 1
            },
            validateStatus: function (status) {
                return true;
            }
        }).then(function (res) {
            expect(res.status).to.equal(500);
            expect(res.data).to.equal('Internal Error');
        });
    });
});

describe('third group of tests', function() {
    before(function(done){
        return beforeEachDescribe(done, 'yes');
    });
    after(afterEachDescribe);

    it('should handle a post request without a processPost function', function() {
        return axios({
            method: 'post',
            url: 'http://localhost:3001/amorphic/init/test.js'
        }).then(function(res) {
            expect(res.status).to.equal(200);
            expect(res.data).to.equal('document.write("<script src=\'/test/js/model.js?ver=0\'></script>");\n\ndocument.write("<script src=\'/test/js/controller.js?ver=0\'></script>");\n\namorphic.setApplication(\'test\');amorphic.setSchema({"Customer":{"referredBy":1,"referrers":1,"addresses":1,"roles":1},"Address":{"customer":1,"returnedMail":1,"account":1},"ReturnedMail":{"address":1},"Role":{"customer":1,"account":1},"Account":{"roles":1,"address":1,"transactions":1,"fromAccountTransactions":1},"Transaction":{"account":1,"fromAccount":1}});amorphic.setConfig({"modules":{}});amorphic.setInitialMessage({"url":"/amorphic/xhr?path=test","message":{"type":"sync","sync":true,"value":null,"name":null,"remoteCallId":null,"changes":"{\\"server-Controller-1\\":{\\"conflictData\\":[null,\\"initial\\"],\\"someData\\":[null,\\"A\\"],\\"sam\\":[null,null],\\"karen\\":[null,null],\\"ashling\\":[null,null],\\"updatedCount\\":[null,0]}}","newSession":true,"rootId":"server-Controller-1","startingSequence":100001,"sessionExpiration":3600000,"ver":"0"}});');
        });
    });

    // WORK IN PROGRESS
    it('should handle a post request with a processPost function', function() {
        return axios({
            method: 'post',
            url: 'http://localhost:3001/amorphic/init/config.js',
            data: {
                test: 'hellooo'
            }
        }).then(function(res) {
            expect(res.status).to.equal(200);
            expect(res.data).to.equal('hellooo');
        });
    });

    it('should process a POST from xhr request when a processPost function is defined', function() {
        return axios({
            method: 'post',
            url: 'http://localhost:3001/amorphic/xhr?path=config&form=true',
            data: {
                test: 'hellooooo'
            },
            validateStatus: function (status) {
                return true;
            }
        }).then(function(res){
            expect(res.status).to.equal(200);
            expect(res.data).to.equal('hellooooo');
        });
    });

});

describe('source mode prod testing', function () {
    before(function(done) {
        return beforeEachDescribe(done, 'yes', 'prod');
    });
    after(afterEachDescribe);

    it('should write to the document the cached.js file', function (){
        return axios({
            method: 'post',
            url: 'http://localhost:3001/amorphic/init/test.js',
        }).then(function (res) {
            expect(res.status).to.equal(200);
            expect(res.data).to.equal('document.write("<script src=\'/amorphic/init/test.cached.js\'></script>");\namorphic.setApplication(\'test\');amorphic.setSchema({"Customer":{"referredBy":1,"referrers":1,"addresses":1,"roles":1},"Address":{"customer":1,"returnedMail":1,"account":1},"ReturnedMail":{"address":1},"Role":{"customer":1,"account":1},"Account":{"roles":1,"address":1,"transactions":1,"fromAccountTransactions":1},"Transaction":{"account":1,"fromAccount":1}});amorphic.setConfig({"modules":{}});amorphic.setInitialMessage({"url":"/amorphic/xhr?path=test","message":{"type":"sync","sync":true,"value":null,"name":null,"remoteCallId":null,"changes":"{\\"server-Controller-1\\":{\\"conflictData\\":[null,\\"initial\\"],\\"someData\\":[null,\\"A\\"],\\"sam\\":[null,null],\\"karen\\":[null,null],\\"ashling\\":[null,null],\\"updatedCount\\":[null,0]}}","newSession":true,"rootId":"server-Controller-1","startingSequence":100001,"sessionExpiration":3600000,"ver":"0"}});');
        });
    });

    it('should retrieve the cached.js file', function (){
        return axios({
            method: 'get',
            url: 'http://localhost:3001/amorphic/init/test.cached.js',
            validateStatus: function (status) {
                return true;
            }
        }).then(function (res) {
            expect(res.status).to.equal(200);
            expect(res.data).to.equal('module.exports.model=function(objectTemplate,getTemplate){var Customer=objectTemplate.create("Customer",{init:function(first,middle,last){this.firstName=first,this.lastName=last,this.middleName=middle},email:{type:String,value:"",length:50,rule:["text","email","required"]},firstName:{type:String,value:"",length:40,rule:["name","required"]},middleName:{type:String,value:"",length:40,rule:"name"},lastName:{type:String,value:"",length:40,rule:["name","required"]},local1:{type:String,persist:!1,value:"local1"},local2:{type:String,isLocal:!0,value:"local2"}}),Address=objectTemplate.create("Address",{init:function(customer){this.customer=customer},lines:{type:Array,of:String,value:[],max:3},city:{type:String,value:"",length:20},state:{type:String,value:"",length:20},postalCode:{type:String,value:"",length:20},country:{type:String,value:"US",length:3}});Customer.mixin({referredBy:{type:Customer,fetch:!0},referrers:{type:Array,of:Customer,value:[],fetch:!0},addAddress:function(lines,city,state,zip){var address=new Address(this);address.lines=lines,address.city=city,address.state=state,address.postalCode=zip,address.customer=this,this.addresses.push(address)},addresses:{type:Array,of:Address,value:[],fetch:!0}});var ReturnedMail=objectTemplate.create("ReturnedMail",{date:{type:Date},address:{type:Address},init:function(address,date){this.address=address,this.date=date}});Address.mixin({customer:{type:Customer},returnedMail:{type:Array,of:ReturnedMail,value:[]},addReturnedMail:function(date){this.returnedMail.push(new ReturnedMail(this,date))}});var Role=objectTemplate.create("Role",{init:function(customer,account,relationship){this.customer=customer,this.account=account,relationship&&(this.relationship=relationship)},relationship:{type:String,value:"primary"},customer:{type:Customer}}),Account=objectTemplate.create("Account",{init:function(number,title,customer,address){address&&(this.address=address,this.address.account=this),this.number=number,this.title=title,customer&&this.addCustomer(customer)},addCustomer:function(customer,relationship){var role=new Role(customer,this,relationship);this.roles.push(role),customer.roles.push(role)},number:{type:Number},title:{type:Array,of:String,max:4},roles:{type:Array,of:Role,value:[],fetch:!0},address:{type:Address},debit:function(amount){new Transaction(this,"debit",amount)},credit:function(amount){new Transaction(this,"credit",amount)},transferFrom:function(amount,fromAccount){new Transaction(this,"xfer",amount,fromAccount)},transferTo:function(amount,toAccount){new Transaction(toAccount,"xfer",amount,this)},listTransactions:function(){function processTransactions(transactions){transactions.forEach(function(transaction){str+=transaction.type+" "+transaction.amount+" "+(transaction.type.xfer?transaction.fromAccount.__id__:"")+" "})}var str="";processTransactions(this.transactions),processTransactions(this.fromAccountTransactions),console.log(str)},getBalance:function(){function processTransactions(transactions){for(var ix=0;ix<transactions.length;++ix)switch(transactions[ix].type){case"debit":balance-=transactions[ix].amount;break;case"credit":balance+=transactions[ix].amount;break;case"xfer":balance+=transactions[ix].amount*(transactions[ix].fromAccount==thisAccount?-1:1)}}var balance=0,thisAccount=this;return processTransactions(this.transactions),processTransactions(this.fromAccountTransactions),balance}});Address.mixin({account:{type:Account}});var Transaction=objectTemplate.create("Transaction",{init:function(account,type,amount,fromAccount){this.account=account,this.fromAccount=fromAccount,this.type=type,this.amount=amount,account&&account.transactions.push(this),fromAccount&&fromAccount.fromAccountTransactions.push(this)},amount:{type:Number},type:{type:String},account:{type:Account,fetch:!0},fromAccount:{type:Account,fetch:!0}});Customer.mixin({roles:{type:Array,of:Role,value:[]}}),Role.mixin({account:{type:Account}}),Account.mixin({transactions:{type:Array,of:Transaction,value:[],fetch:!0},fromAccountTransactions:{type:Array,of:Transaction,value:[],fetch:!0}});objectTemplate.create("Controller",{mainFunc:{on:"server",body:function(){}},sam:{type:Customer},karen:{type:Customer},ashling:{type:Customer},init:function(){var sam=new Customer("Sam","M","Elsamman"),karen=new Customer("Karen","M","Burke"),ashling=new Customer("Ashling","","Burke");sam.referrers=[ashling,karen],ashling.referredBy=sam,karen.referredBy=sam,sam.local1="foo",sam.local2="bar",sam.addAddress(["500 East 83d","Apt 1E"],"New York","NY","10028"),sam.addAddress(["38 Haggerty Hill Rd",""],"Rhinebeck","NY","12572"),sam.addresses[0].addReturnedMail(new Date),sam.addresses[0].addReturnedMail(new Date),sam.addresses[1].addReturnedMail(new Date),karen.addAddress(["500 East 83d","Apt 1E"],"New York","NY","10028"),karen.addAddress(["38 Haggerty Hill Rd",""],"Rhinebeck","NY","12572"),karen.addresses[0].addReturnedMail(new Date),ashling.addAddress(["End of the Road",""],"Lexington","KY","34421");var samsAccount=new Account(1234,["Sam Elsamman"],sam,sam.addresses[0]),jointAccount=new Account(123,["Sam Elsamman","Karen Burke","Ashling Burke"],sam,karen.addresses[0]);jointAccount.addCustomer(karen,"joint"),jointAccount.addCustomer(ashling,"joint"),samsAccount.credit(100),samsAccount.debit(50),jointAccount.credit(200),jointAccount.transferTo(100,samsAccount),jointAccount.transferFrom(50,samsAccount),jointAccount.debit(25),this.sam=sam,this.karen=karen,this.ashling=ashling},preServerCall:function(changeCount,objectsChanged){for(var templateName in objectsChanged)this.preServerCallObjects[templateName]=!0},postServerCall:function(){if(this.postServerCallThrowException)throw"postServerCallThrowException";if(this.postServerCallThrowRetryException)throw"Retry"},validateServerCall:function(){return this.canValidateServerCall},preServerCallObjects:{isLocal:!0,type:Object,value:{}},preServerCalls:{isLocal:!0,type:Number,value:0},postServerCalls:{isLocal:!0,type:Number,value:0},preServerCallThrowException:{isLocal:!0,type:Boolean,value:!1},postServerCallThrowException:{isLocal:!0,type:Boolean,value:!1},postServerCallThrowRetryException:{isLocal:!0,type:Boolean,value:!1},serverCallThrowException:{isLocal:!0,type:Boolean,value:!1},canValidateServerCall:{isLocal:!0,type:Boolean,value:!0}});return{Customer:Customer,Address:Address,ReturnedMail:ReturnedMail,Role:Role,Account:Account,Transaction:Transaction}},module.exports.controller=function(objectTemplate,getTemplate){objectTemplate.debugInfo="io;api",objectTemplate.objectMap={};var Customer=getTemplate("model.js").Customer,Account=getTemplate("model.js").Account,Address=getTemplate("model.js").Address,ReturnedMail=getTemplate("model.js").ReturnedMail,Role=getTemplate("model.js").Role,Transaction=getTemplate("model.js").Transaction,Controller=objectTemplate.create("Controller",{mainFunc:{on:"server",body:function(){}},conflictData:{type:String,value:"initial"},someData:{type:String,value:"A"},sam:{type:Customer,fetch:!0},karen:{type:Customer,fetch:!0},ashling:{type:Customer,fetch:!0},updatedCount:{type:Number,value:0},serverInit:function(){serverController=this},clearDB:{on:"server",body:function(){}},clientInit:function(){clientController=this;var sam=new Customer("Sam","M","Elsamman"),karen=new Customer("Karen","M","Burke"),ashling=new Customer("Ashling","","Burke");sam.referrers=[ashling,karen],ashling.referredBy=sam,karen.referredBy=sam,sam.local1="foo",sam.local2="bar",sam.addAddress(["500 East 83d","Apt 1E"],"New York","NY","10028"),sam.addAddress(["38 Haggerty Hill Rd",""],"Rhinebeck","NY","12572"),sam.addresses[0].addReturnedMail(new Date),sam.addresses[0].addReturnedMail(new Date),sam.addresses[1].addReturnedMail(new Date),karen.addAddress(["500 East 83d","Apt 1E"],"New York","NY","10028"),karen.addAddress(["38 Haggerty Hill Rd",""],"Rhinebeck","NY","12572"),karen.addresses[0].addReturnedMail(new Date),ashling.addAddress(["End of the Road",""],"Lexington","KY","34421");var samsAccount=new Account(1234,["Sam Elsamman"],sam,sam.addresses[0]),jointAccount=new Account(123,["Sam Elsamman","Karen Burke","Ashling Burke"],sam,karen.addresses[0]);jointAccount.addCustomer(karen,"joint"),jointAccount.addCustomer(ashling,"joint"),samsAccount.credit(100),samsAccount.debit(50),jointAccount.credit(200),jointAccount.transferTo(100,samsAccount),jointAccount.transferFrom(50,samsAccount),jointAccount.debit(25),this.sam=sam,this.karen=karen,this.ashling=ashling},preServerCall:function(changeCount,objectsChanged){for(var templateName in objectsChanged)this.preServerCallObjects[templateName]=!0;return Q().then(!this.sam||this.sam.refresh.bind(this.sam,null)).then(!this.karen||this.karen.refresh.bind(this.karen,null)).then(!this.ashling||this.ashling.refresh.bind(this.ashling,null)).then(function(){objectTemplate.begin(),console.log(this.sam?this.sam.__version__:""),objectTemplate.currentTransaction.touchTop=!0}.bind(this))},postServerCall:function(){if(this.postServerCallThrowException)throw"postServerCallThrowException";if(this.postServerCallThrowRetryException)throw"Retry";return serverController.sam.cascadeSave(),serverController.karen.cascadeSave(),serverController.ashling.cascadeSave(),objectTemplate.currentTransaction.postSave=function(txn){this.updatedCount=_.toArray(txn.savedObjects).length}.bind(this),objectTemplate.end().then(function(){PostCallAssert()})},validateServerCall:function(){return this.canValidateServerCall},preServerCallObjects:{isLocal:!0,type:Object,value:{}},preServerCalls:{isLocal:!0,type:Number,value:0},postServerCalls:{isLocal:!0,type:Number,value:0},preServerCallThrowException:{isLocal:!0,type:Boolean,value:!1},postServerCallThrowException:{isLocal:!0,type:Boolean,value:!1},postServerCallThrowRetryException:{isLocal:!0,type:Boolean,value:!1},serverCallThrowException:{isLocal:!0,type:Boolean,value:!1},canValidateServerCall:{isLocal:!0,type:Boolean,value:!0}});return{Controller:Controller}};');;
        });
    });

    it('should retrieve the cached.js.map file', function () {
        return axios({
            method: 'get',
            url: 'http://localhost:3001/amorphic/init/test.cached.js.map',
            validateStatus: function (status) {
                return true;
            }
        }).then(function (res) {
            console.log(res);
            expect(res.status).to.equal(200);
            expect(res.data.version).to.equal(3);
            expect(res.data.mappings).to.equal('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');
        });
    });
});
