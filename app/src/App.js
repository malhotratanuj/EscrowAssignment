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

function App() {
  const [escrows, setEscrows] = useState([]);
  const [account, setAccount] = useState();
  const [signer, setSigner] = useState();
  const [loading, setLoading] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [contractToDelete, setContractToDelete] = useState(null);

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

  async function newContract() {
    const beneficiary = document.getElementById('beneficiary').value;
    const arbiter = document.getElementById('arbiter').value;
    const value = ethers.BigNumber.from(document.getElementById('wei').value);
    const escrowContract = await deploy(signer, arbiter, beneficiary, value);


    const escrow = {
      address: escrowContract.address,
      arbiter,
      beneficiary,
      value: value.toString(),
      handleApprove: async () => {
        toggleLoading(true); // Show loading animation
        escrowContract.on('Approved', () => {
          toggleLoading(false); // Hide loading animation after approval
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
      }
    };

    setEscrows([...escrows, escrow]);
  }

  const handleConfirmDelete = () => {
    // Find the index of the contract to delete
    const index = escrows.findIndex((escrow) => escrow.address === contractToDelete);

    // If the contract is found, remove it from the array
    if (index !== -1) {
      const updatedEscrows = [...escrows];
      updatedEscrows.splice(index, 1);
      setEscrows(updatedEscrows);
    }

    // Close the confirmation modal
    closeConfirmationModal();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="w-full sm:max-w-md mx-auto bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <h1 className="text-xl font-bold mb-4">New Contract</h1>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="arbiter">
            Arbiter Address
          </label>
          <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="arbiter" type="text" placeholder="Arbiter Address" />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="beneficiary">
            Beneficiary Address
          </label>
          <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="beneficiary" type="text" placeholder="Beneficiary Address" />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="wei">
            Deposit Amount (in Wei)
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
              <button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full" onClick={() => escrow.handleDelete(escrow.address)}>
                Delete Contract
              </button>
            </div>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center mt-8">
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
    </div>
  );
}

export default App;
