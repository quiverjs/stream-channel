import 'traceur'
import { primitiveChannel } from '../lib/primitive.js'

var should = require('should')

var guard = callback => {
  var called = false
  return (...args) => {
    if(called) throw new Error('callback is called multiple times')
    callback(...args)
  }
}

describe('different correct read write sequences', () => {
  it('read write write read read closeWrite', callback => {
    var { readStream, writeStream } = primitiveChannel()

    var firstData = 'foo'
    var secondData = 'bar'
    var closeErr = 'error'

    // 1
    readStream.read(guard((streamClosed, data) => {
      should.not.exist(streamClosed)
      data.should.equal(firstData)

      // 3
      writeStream.prepareWrite(guard((streamClosed, writer) => {
        should.not.exist(streamClosed)
        writer.should.be.a.Function

        writer(null, secondData)
      }))

      // 4
      readStream.read(guard((streamClosed, data) => {
        should.not.exist(streamClosed)
        data.should.equal(secondData)

        // 5
        readStream.read(guard((streamClosed, data) => {
          should.exist(streamClosed)
          streamClosed.err.should.equal(closeErr)
          should.not.exist(data)

          callback(null)
        }))

        // 6
        writeStream.closeWrite(closeErr)
      }))
    }))

    // 2
    writeStream.prepareWrite(guard((streamClosed, writer) => {
      should.not.exist(streamClosed)
      writer.should.be.a.Function

      writer(null, firstData)
    }))
  })

  it('write read read write closeRead write', callback => {
    var { readStream, writeStream } = primitiveChannel()

    var firstData = 'foo'
    var secondData = 'bar'
    var closeErr = 'error'

    // 1
    writeStream.prepareWrite(guard((streamClosed, writer) => {
      should.not.exist(streamClosed)
      writer.should.be.a.Function

      writer(null, firstData)
    }))

    // 2
    readStream.read(guard((streamClosed, data) => {
      should.not.exist(streamClosed)
      data.should.equal(firstData)

      // 3
      readStream.read(guard((streamClosed, data) => {
        should.not.exist(streamClosed)
        data.should.equal(secondData)

        // 5
        readStream.closeRead(closeErr)

        // 6
        writeStream.prepareWrite(guard((streamClosed, writer) => {
          should.exist(streamClosed)
          streamClosed.err.should.equal(closeErr)
          should.not.exist(writer)
          
          callback(null)
        }))
      }))

      // 4
      writeStream.prepareWrite(guard((streamClosed, writer) => {
        should.not.exist(streamClosed)
        writer.should.be.a.Function

        writer(null, secondData)
      }))
    }))
  })
})

describe('inconsistent states', () => {
  it('when read is called twice', () => {
    var { readStream } = primitiveChannel()

    ;(() => {
      readStream.read(function(streamClosed, buffer) {
        should.fail()
      })
    }).should.not.throw()

    ;(() => {
      readStream.read(function(streamClosed, buffer) {
        should.fail()
      })
    }).should.throw()
  })
})