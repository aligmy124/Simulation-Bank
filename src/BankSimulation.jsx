import React, { useState } from "react";
import { Bar } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const BankSimulation = () => {
  const [customers, setCustomers] = useState([]);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [intervalTime, setIntervalTime] = useState("");
  const [server, setServer] = useState("sr01");

  const serverServiceDurations = {
    sr01: [],
    sr02: [],
  };

  const addCustomer = (e) => {
    e.preventDefault();
    if (name && duration && intervalTime) {
      const newDuration = parseInt(duration, 10);
      const newIntervalTime = parseInt(intervalTime, 10);

      serverServiceDurations[server].push(newDuration);

      const averageDuration = serverServiceDurations[server].reduce((a, b) => a + b, 0) / serverServiceDurations[server].length || 0;

      const arrivalTime = customers.length > 0 
        ? new Date(customers[customers.length - 1].arrivalTime.getTime() + newIntervalTime * 1000)
        : new Date();

      const newCustomer = {
        id: customers.length + 1,
        arrival: arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        customer: name,
        duration: newDuration,
        server: server,
        interarrivalTime: newIntervalTime,
        arrivalTime,
      };

      setCustomers([...customers, newCustomer]);
      setName("");
      setDuration("");
      setIntervalTime("");
    }
  };

  const formatTime = (timeInMinutes) => {
    const totalSeconds = Math.floor(timeInMinutes * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const buildSimulationTable = () => {
    let currentTime = 0;
    return customers.map((item) => {
      const arrivalTimeInMinutes = item.arrivalTime.getHours() * 60 + item.arrivalTime.getMinutes();
      const startTime = Math.max(currentTime, arrivalTimeInMinutes);
      const endTime = startTime + item.duration;

      const waitingTime = Math.max(0, startTime - arrivalTimeInMinutes);
      const serviceTime = item.duration;

      currentTime = endTime;

      return {
        ...item,
        startTime: formatTime(startTime),
        endTime: formatTime(endTime),
        waitingTime: waitingTime,
        serviceTime: serviceTime,
      };
    });
  };

  const calculatePerformanceMetrics = (simulationTable) => {
    const totalWaitingTime = simulationTable.reduce((acc, item) => acc + item.waitingTime, 0);
    const totalServiceTime = simulationTable.reduce((acc, item) => acc + item.serviceTime, 0);
    
    const interarrivalTimes = [];
    for (let i = 1; i < simulationTable.length; i++) {
        const arrivalTimeCurrent = new Date(simulationTable[i].arrivalTime).getTime();
        const arrivalTimePrevious = new Date(simulationTable[i - 1].arrivalTime).getTime();
        const interarrivalTime = (arrivalTimeCurrent - arrivalTimePrevious) / 1000;
        interarrivalTimes.push(interarrivalTime);
    }
    
    const totalInterarrivalTime = interarrivalTimes.reduce((acc, time) => acc + time, 0);
    const numberOfInterarrivalTimes = interarrivalTimes.length;
    const averageInterarrivalTime = numberOfInterarrivalTimes > 0 ? totalInterarrivalTime / numberOfInterarrivalTimes : 0;

    const numberOfCustomers = simulationTable.length;
    const averageWaitingTime = numberOfCustomers > 0 ? totalWaitingTime / numberOfCustomers : 0;
    const averageServiceTime = numberOfCustomers > 0 ? totalServiceTime / numberOfCustomers : 0;

    const totalTimeSpent = totalWaitingTime + totalServiceTime;
    
    const serverUtilization = totalServiceTime > 0 ? totalServiceTime / totalTimeSpent : 0;

    return {
        averageWaitingTime,
        averageServiceTime,
        averageInterarrivalTime,
        totalTimeSpent,
        serverUtilization,
    };
  };

  const simulationTable = buildSimulationTable();
  const performanceMetrics = calculatePerformanceMetrics(simulationTable);

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(simulationTable);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Simulation Data");
    XLSX.writeFile(workbook, "SimulationData.xlsx");
  };

  const chartData = {
    labels: simulationTable.map(item => item.customer),
    datasets: [
      {
        label: 'Start Time (minutes)',
        data: simulationTable.map(item => {
          const [hours, minutes] = item.startTime.split(':').map(Number);
          return hours * 60 + minutes;
        }),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
      {
        label: 'End Time (minutes)',
        data: simulationTable.map(item => {
          const [hours, minutes] = item.endTime.split(':').map(Number);
          return hours * 60 + minutes;
        }),
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
      },
    ],
  };

  return (
    <div className="card shadow p-4">
      <h1 className="text-center">Bank Simulation</h1>
      <form onSubmit={addCustomer} className="mb-4">
        <div className="mb-3">
          <label className="form-label">Customer Name</label>
          <input
            type="text"
            className="form-control"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Duration (minutes)</label>
          <input
            type="number"
            className="form-control"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Interarrival Time (seconds)</label>
          <input
            type="number"
            className="form-control"
            value={intervalTime}
            onChange={(e) => setIntervalTime(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Server</label>
          <select className="form-select" value={server} onChange={(e) => setServer(e.target.value)}>
            <option value="sr01">Server 01</option>
            <option value="sr02">Server 02</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary">Add Customer</button>
      </form>

      <h2>Simulation Table</h2>
      <table className="table table-striped">
        <thead>
          <tr>
            <th>ID</th>
            <th>Customer</th>
            <th>Arrival</th>
            <th>Duration</th>
            <th>Server</th>
            <th>Start Time</th>
            <th>End Time</th>
            <th>Waiting Time</th>
            <th>Service Time</th>
            <th>Interarrival Time (seconds)</th>
          </tr>
        </thead>
        <tbody>
          {simulationTable.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.customer}</td>
              <td>{item.arrival}</td>
              <td>{item.duration}</td>
              <td>{item.server}</td>
              <td>{item.startTime}</td>
              <td>{item.endTime}</td>
              <td>{item.waitingTime.toFixed(2)}</td>
              <td>{item.serviceTime.toFixed(2)}</td>
              <td>{item.interarrivalTime}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button className="btn btn-success mb-3" onClick={exportToExcel}>Export to Excel</button>

      <h2>Performance Metrics</h2>
      <p>Average Waiting Time: {performanceMetrics.averageWaitingTime.toFixed(2)} minutes</p>
      <p>Average Service Time: {performanceMetrics.averageServiceTime.toFixed(2)} minutes</p>
      <p>Average Interarrival Time: {performanceMetrics.averageInterarrivalTime.toFixed(2)} seconds</p>
      <p>Total Time Spent: {performanceMetrics.totalTimeSpent.toFixed(2)} minutes</p>
      <p>Server Utilization: {performanceMetrics.serverUtilization.toFixed(2)}</p>

      <h2>Time Analysis Chart</h2>
      <div className="my-4">
        <Bar data={chartData} options={{
          responsive: true,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: true,
              text: 'Time Analysis for Customers',
            },
          },
        }} />
      </div>
    </div>
  );
};

export default BankSimulation;
