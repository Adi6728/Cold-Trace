import os
import subprocess
import logging
import sys

logger = logging.getLogger(__name__)

# Global dict to store process references: { sensor_id: {"process": Popen, "mode": "NORMAL" | "EXCURSION"} }
_running_simulations = {}

class SimulationService:
    @staticmethod
    def start_simulation(sensor_id: int, sensor_code: str, shipment_id: int, mode: str = "NORMAL"):
        if sensor_id in _running_simulations:
            # Check if it's actually running
            proc = _running_simulations[sensor_id]["process"]
            if proc.poll() is None:
                raise ValueError("Simulation already running for this sensor.")

        env = os.environ.copy()
        env["SENSOR_CODE"] = sensor_code
        env["SHIPMENT_ID"] = str(shipment_id)
        env["SCENARIO"] = mode

        simulator_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../iot_simulator.py"))
        
        proc = subprocess.Popen(
            [sys.executable, simulator_path],
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        
        _running_simulations[sensor_id] = {
            "process": proc,
            "mode": mode
        }
        logger.info(f"Started simulation for sensor {sensor_id} (code {sensor_code}) in {mode} mode.")

    @staticmethod
    def stop_simulation(sensor_id: int):
        if sensor_id in _running_simulations:
            proc = _running_simulations[sensor_id]["process"]
            if proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    proc.kill()
            del _running_simulations[sensor_id]
            logger.info(f"Stopped simulation for sensor {sensor_id}.")
        else:
            logger.info(f"No running simulation found for sensor {sensor_id} to stop.")

    @staticmethod
    def set_simulation_mode(sensor_id: int, sensor_code: str, shipment_id: int, mode: str):
        # Stop existing
        SimulationService.stop_simulation(sensor_id)
        # Start new one
        SimulationService.start_simulation(sensor_id, sensor_code, shipment_id, mode)

    @staticmethod
    def get_simulation_status(sensor_id: int):
        if sensor_id in _running_simulations:
            proc = _running_simulations[sensor_id]["process"]
            if proc.poll() is None:
                return {
                    "status": "RUNNING",
                    "mode": _running_simulations[sensor_id]["mode"]
                }
            else:
                # Process died
                del _running_simulations[sensor_id]
        
        return {
            "status": "STOPPED",
            "mode": "NORMAL"
        }
