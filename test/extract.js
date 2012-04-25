var path = require('path'),
    fs = require('fs'),
    samplePath = path.resolve(__dirname, 'samples'),
    esprima = require('esprima'),
    periscope = require('../');
    
fs.readdir(samplePath, function(err, files) {
    describe('sample context marking', function() {
        (files || []).forEach(function(file) {
            it('should be able to determine scope within: ' + file, function() {
                var data = fs.readFileSync(path.join(samplePath, file), 'utf8'),
                    ast = esprima.parse(data);

                // write the scope data to a reference file
                fs.writeFileSync(
                    path.resolve(__dirname, 'meta', path.basename(file, '.js') + '.prescope.json'), 
                    JSON.stringify(ast, null, 2), 
                    'utf8'
                );

                // add the scope data to the ast
                periscope(ast);
                
                // write the scope data to a reference file
                fs.writeFileSync(
                    path.resolve(__dirname, 'meta', path.basename(file, '.js') + '.json'), 
                    JSON.stringify(ast, null, 2), 
                    'utf8'
                );
            });
        });
    });
});
