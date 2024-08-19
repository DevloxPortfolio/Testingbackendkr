const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Import the models
const Student = require('../models/student');
const Bus = require('../models/bus');
const Stop = require('../models/stop');

// Bus allocation route
router.get('/students-with-buses', async (req, res) => {
  try {
    const students = await Student.find({});
    const buses = await Bus.find({});
    const stops = await Stop.find({});

    const stopMap = stops.reduce((map, stop) => {
      map[stop.code] = stop.stopname;
      return map;
    }, {});

    const allocatedBuses = new Set();
    let allocatedCount = 0;
    let nonAllocatedStudents = [];
    
    // Clone buses to track initial capacity and avoid mutation
    const busesClone = buses.map(bus => ({
      ...bus.toObject(),
      InitialCapacity: bus.Capacity // Track initial capacity
    }));

    // Map buses to track capacity updates
    const busesCapacityMap = busesClone.reduce((map, bus) => {
      map[bus.Busno] = bus;
      return map;
    }, {});

    console.log('Initial Buses Capacities:', busesClone);

    // Allocate students to buses
    for (const student of students) {
      let assigned = false;
      for (const bus of busesClone) {
        for (let i = 1; i <= 9; i++) {
          if (student.Stop === bus[`stop${i}`] && bus.Capacity > 0) {
            student.BusNumber = bus.Busno;
            student.BusSrNumber = bus.BusSrNO;
            student.StopName = stopMap[student.Stop];
            bus.Capacity--;
            allocatedBuses.add(bus.Busno);
            assigned = true;
            break;
          }
        }
        if (assigned) break;
      }
      if (assigned) {
        allocatedCount++;
      } else {
        nonAllocatedStudents.push(student);
      }
    }

    console.log('Buses after allocation:', busesClone);

    // Update the database with the allocated bus information
    await Promise.all(students.map(student => 
      Student.updateOne({ _id: student._id }, student)
    ));
    
    // Update the buses with the new capacities
    await Promise.all(buses.map(bus => {
      const updatedBus = busesCapacityMap[bus.Busno];
      return Bus.updateOne(
        { Busno: bus.Busno },
        { Capacity: updatedBus.Capacity }
      );
    }));

    // Compute capacity details
    const capacityDetails = buses.map(bus => {
      const originalBus = busesClone.find(b => b.Busno === bus.Busno);
      return {
        BusNumber: bus.Busno,
        Route: bus.Route,
        InitialCapacity: originalBus.InitialCapacity,
        FinalCapacity: bus.Capacity
      };
    });

    // Log allocated students with bus details and stops
    console.log('Allocated Students with Bus Details:');
    students.forEach(student => {
      if (student.BusNumber) {
        console.log(`Enrollment Code: ${student.EnrollmentCode}, Student Name: ${student.StudentName}, Bus Number: ${student.BusNumber}, Bus SR Number: ${student.BusSrNumber}, Stop: ${student.StopName}`);
      }
    });

    res.status(200).json({
      students,
      nonAllocatedStudents,
      allocatedCount,
      nonAllocatedCount: buses.length - allocatedBuses.size,
      capacityDetails
    });
  } catch (error) {
    console.error('Error fetching student data:', error);
    res.status(500).json({ message: 'Error fetching student data', error });
  }
});

module.exports = router;
