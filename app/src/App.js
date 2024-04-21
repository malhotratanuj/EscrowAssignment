import { ethers } from 'ethers';
import { useEffect, useState } from 'react';
import deploy from './deploy';
import Escrow from './Escrow';
import { SyncLoader } from 'react-spinners';

const provider = new ethers.providers.Web3Provider(window.ethereum);

export async function approve(escrowContract, signer) {
  const approveTxn = await escrowContract.connect(signer).approve();
  await approveTxn.wait();
}

export async function setTimelock(escrowContract, signer, unlockTime) {
  const setTimelockTxn = await escrowContract.connect(signer).setTimelock(unlockTime);
  await setTimelockTxn.wait();
}

function App() {
  const [escrows, setEscrows] = useState([]);
  const [account, setAccount] = useState();
  const [signer, setSigner] = useState();
  const [loading, setLoading] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [contractToDelete, setContractToDelete] = useState(null);
  const [timelockValue, setTimelockValue] = useState('');
  const [showTimelockModal, setShowTimelockModal] = useState(false);
  const [contractToSetTimelock, setContractToSetTimelock] = useState(null);
  const [disableApproveButton, setDisableApproveButton] = useState(false); // New state variable
  const [showTimeSetPrompt, setShowTimeSetPrompt] = useState(false); // New state variable

  useEffect(() => {
    async function getAccounts() {
      const accounts = await provider.send('eth_requestAccounts', []);

      setAccount(accounts[0]);
      setSigner(provider.getSigner());
    }

    getAccounts();
  }, [account]);

  const toggleLoading = (isLoading) => setLoading(isLoading);
  const openConfirmationModal = () => setShowConfirmationModal(true);
  const closeConfirmationModal = () => setShowConfirmationModal(false);

  const openTimelockModal = (contractAddress) => {
    setShowTimelockModal(true);
    setContractToSetTimelock(contractAddress);
  };

  const closeTimelockModal = () => {
    setShowTimelockModal(false);
    setTimelockValue('');
    setContractToSetTimelock(null);
  };

  const handleConfirmDelete = () => {
    // index of the contract to delete
    const index = escrows.findIndex((escrow) => escrow.address === contractToDelete);

    if (index !== -1) {
      const updatedEscrows = [...escrows];
      updatedEscrows.splice(index, 1);
      setEscrows(updatedEscrows);
    }

    closeConfirmationModal();
  };

  const handleSetTimelock = async () => {
    const unlockTime = parseInt(timelockValue);
    if (!isNaN(unlockTime)) {
      await setTimelock(contractToSetTimelock, signer, unlockTime);
      closeTimelockModal(); // Close the Timelock modal after setting the timelock
      // amd ..Update the escrow object to indicate that the timelock is set
      const updatedEscrows = escrows.map((escrow) => {
        if (escrow.address === contractToSetTimelock) {
          return {
            ...escrow,
            isTimelockSet: true
          };
        }
        return escrow;
      });
      setEscrows(updatedEscrows);
      setDisableApproveButton(true);
      setTimeout(() => {
        setDisableApproveButton(false);
      }, 60000); 
      setShowTimeSetPrompt(true);
      setTimeout(() => {
        setShowTimeSetPrompt(false);
      }, 3000);
    }
  };

  const newContract = async () => {
    const beneficiary = document.getElementById('beneficiary').value;
    const arbiter = document.getElementById('arbiter').value;
    const value = ethers.BigNumber.from(document.getElementById('wei').value);
    const escrowContract = await deploy(signer, arbiter, beneficiary, value);

    const escrow = {
      address: escrowContract.address,
      arbiter,
      beneficiary,
      value: value.toString(),
      isTimelockSet: false, 
      handleApprove: async () => {
        toggleLoading(true); // loading animation
        escrowContract.on('Approved', () => {
          toggleLoading(false); // Hide animation after approval
          document.getElementById(escrowContract.address).className =
            'complete';
          document.getElementById(escrowContract.address).innerText =
            "✓ It's been approved!";
        });

        await approve(escrowContract, signer);
      },
      handleDelete: async (contractAddress) => {
        setContractToDelete(contractAddress);
        openConfirmationModal();
      },
      handleSetTimelock: async (contractAddress) => {
        setContractToSetTimelock(contractAddress);
        openTimelockModal(contractAddress);
      }
    };

    setEscrows([...escrows, escrow]);
  };

  return (
    <div className="container mx-auto px-4 py-4 ">
      <div className="w-full sm:max-w-md mx-auto bg-white shadow-md rounded px-8 pt-4 pb-6 mb-4">
        <h1 className="text-xl font-bold mb-2">New Contract</h1>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="arbiter">
            Broker's Address
          </label>
          <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="arbiter" type="text" placeholder="Broker Address" />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="beneficiary">
            Recipient's Address
          </label>
          <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="beneficiary" type="text" placeholder="Recipient Address" />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="wei">
            Fund Amount (in Wei)
          </label>
          <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="wei" type="text" placeholder="Deposit Amount" />
        </div>
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full" onClick={newContract}>
          Deploy
        </button>
      </div>

      <div>
        <h1 className="text-xl font-bold mb-4">Existing Contracts</h1>
        <div>
          {escrows.map((escrow) => (
            <div key={escrow.address} className="bg-white shadow-md rounded px-8 py-6 mb-4">
              <Escrow {...escrow} />
              <button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full mb-2" onClick={() => escrow.handleDelete(escrow.address)}>
                Delete Contract
              </button>
              <button className={`bg-blue-500 ${escrow.isTimelockSet ? 'bg-opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'} text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full`} onClick={() => escrow.handleSetTimelock(escrow.address)}>
                {escrow.isTimelockSet ? 'Timelocked' : 'Set Timelock'}
              </button>
              {disableApproveButton && (
                <p className="text-red-500 mt-2">Approve button disabled for 1 minute</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center mt-4">
          <SyncLoader color={'#36D7B7'} loading={loading} size={15} />
          <p className="ml-2">Approving...</p>
        </div>
      )}

      {showConfirmationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white shadow-md rounded px-8 py-6">
            <p className="text-lg font-bold mb-4">Are you sure you want to delete this contract?</p>
            <div className="flex justify-end">
              <button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mr-2 focus:outline-none focus:shadow-outline" onClick={handleConfirmDelete}>Yes</button>
              <button className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" onClick={closeConfirmationModal}>No</button>
            </div>
          </div>
        </div>
      )}

      {showTimelockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-800 bg-opacity-50">
          <div className="bg-white shadow-md rounded px-8 py-6">
            <p className="text-lg font-bold mb-4">Set Timelock</p>
            <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" type="text" placeholder="Unlock Time (Unix Timestamp)" value={timelockValue} onChange={(e) => setTimelockValue(e.target.value)} />
            <div className="flex justify-end mt-4">
              <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2 focus:outline-none focus:shadow-outline" onClick={closeTimelockModal}>Set</button>
              <button className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" onClick={closeTimelockModal}>Cancel</button>
            </div>
            {showTimeSetPrompt && (
              <p className="text-green-500 mt-2">Time set successfully!</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
