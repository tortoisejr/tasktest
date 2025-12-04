/*
 * Hospital A Application - Data Sharing
 * Hospital A can share IPFS hashes with other hospitals
 */

const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

// Helper function to pretty print JSON
function prettyJSONString(inputString) {
    if (inputString) {
        return JSON.stringify(JSON.parse(inputString), null, 2);
    }
    return inputString;
}

async function main() {
    try {
        console.log('=== Hospital A - Data Sharing Application ===');

        // Load connection profile
        const ccpPath = path.resolve(__dirname, '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
        console.log('✓ Loaded connection profile');

        // Create wallet
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`✓ Wallet path: ${walletPath}`);

        // Check if HospitalA identity exists
        const identity = await wallet.get('HospitalA');
        if (!identity) {
            console.log('❌ HospitalA identity not found in wallet. Please run registerUsers.js first');
            process.exit(1);
        }
        console.log('✓ HospitalA identity loaded');

        // Create gateway
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: 'HospitalA',
            discovery: { enabled: true, asLocalhost: true }
        });
        console.log('✓ Gateway connected');

        // Get network and contract
        const network = await gateway.getNetwork('hospitalchannel');
        const contract = network.getContract('hospital');
        console.log('✓ Contract loaded');

        // Sample data - using comma-separated strings for allowed hospitals
        const sampleData = [
            {
                dataID: "PATIENT_001",
                hospitalA: "HospitalA",
                ipfsHash: "QmXyz123PatientRecordHash001",
                description: "Patient MRI Scan Results",
                allowedHospitals: "HospitalB"
            },
            {
                dataID: "LAB_002",
                hospitalA: "HospitalA", 
                ipfsHash: "QmXyz123LabResultsHash002",
                description: "Blood Test Results",
                allowedHospitals: "HospitalB"
            },
            // Add to sampleData array in hospitalA-app.js
            {
                dataID: "MRI_003",  // ← FIXED: Changed from XRAY_003
                hospitalA: "HospitalA", 
                ipfsHash: "QmW1ejJMppViusLkr1m8pyAxesHWVJxPJu8pr9oPEU8e7u",  // ← FIXED: Changed hash
                description: "MRI Scan Report",  // ← FIXED: Changed description
                allowedHospitals: "HospitalB"
                
            }
        ];

        console.log('\n📤 Sharing sample data with Hospital B...');

        // Share each data item
        for (const data of sampleData) {
            try {
                console.log(`\nSharing data: ${data.dataID}`);
                console.log(`IPFS Hash: ${data.ipfsHash}`);
                console.log(`Allowed Hospitals: ${data.allowedHospitals}`);

                const result = await contract.submitTransaction(
                    'ShareData',
                    data.dataID,
                    data.hospitalA,
                    data.ipfsHash,
                    data.description,
                    data.allowedHospitals
                );

                console.log(`✅ Successfully shared ${data.dataID}`);
                if (result && result.length > 0) {
                    console.log(`Transaction response: ${result.toString()}`);
                }

            } catch (error) {
                console.log(`⚠️  Error for ${data.dataID}: ${error.message}`);
                // Continue with next data item even if one fails
            }
        }

        // Query all data to verify
        console.log('\n📋 Querying all shared data...');
        try {
            // const allData = await contract.evaluateTransaction('GetAllData');
            const allData = await contract.evaluateTransaction('GetAllData', 'HospitalA');
            console.log('All shared data:');
            console.log(prettyJSONString(allData.toString()));
        } catch (error) {
            console.log(`Could not retrieve all data: ${error.message}`);
        }

        await gateway.disconnect();
        console.log('\n✅ Hospital A operations completed successfully!');

    } catch (error) {
        console.error(`❌ Failed to execute Hospital A application: ${error}`);
        process.exit(1);
    }
}

main();
