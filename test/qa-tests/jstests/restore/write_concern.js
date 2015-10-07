(function() {

  if (typeof getToolTest === 'undefined') {
    load('jstests/configs/plain_28.config.js');
  }
  var toolTest = new ToolTest('write_concern', null);
  var commonToolArgs = getCommonToolArguments();

  rs = new ReplSetTest({
    name: "rpls",
    nodes: 3,
    useHostName: true
  });

  rs.startSet();
  rs.initiate();
  rs.awaitReplication();
  toolTest.port = rs.getMaster().port;
  var dbOne = rs.getMaster().getDB("dbOne");

  function writeConcernTestFunc(exitCode, writeConcern, name) {
    jsTest.log(name);
    ret = toolTest.runTool.apply(
        toolTest,
        ['restore'].
        concat(writeConcern).
        concat(getRestoreTarget(dumpTarget)).
        concat(commonToolArgs)
        );
    assert.eq(exitCode, ret, name);
    dbOne.dropDatabase();
  }

  function noConnectTest() {
    return startMongoProgramNoConnect.apply(null,
        ['mongorestore','--writeConcern={w:3}','--host',rs.nodes[0].host].
        concat(getRestoreTarget(dumpTarget)).
        concat(commonToolArgs)
        );
  }

  // create a test collection
  for(var i=0;i<=100;i++){
    dbOne.test.insert({_id:i, x:i*i});
  }
  rs.awaitReplication();

  // dump the data that we'll
  var dumpTarget = 'write_concern_dump';
  resetDbpath(dumpTarget);
  var ret = toolTest.runTool.apply(
      toolTest,
      ['dump'].
      concat(getDumpTarget(dumpTarget)).
      concat(commonToolArgs)
      );
  assert.eq(0, ret);

  // drop the database so it's empty
  dbOne.dropDatabase()

  // load and run the write concern suite
  load('jstests/libs/wc_framework.js');
  runWCTest("mongorestore", rs, toolTest, writeConcernTestFunc, noConnectTest);

  dbOne.dropDatabase();
  rs.stopSet();
  toolTest.stop();

}());
