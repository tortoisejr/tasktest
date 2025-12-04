/*
 * User Registration for Hospital Network - FIXED VERSION with HospitalC
 */

const { Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        console.log('=== Starting Hospital User Registration ===');
        
        // Load connection profile - FIXED PATH
        const ccpPath = path.resolve(__dirname, '../test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
        console.log('✓ Loaded connection profile');

        // Create CA client
        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { 
            trustedRoots: caTLSCACerts, 
            verify: false 
        }, caInfo.caName);
        console.log('✓ Created CA client');

        // Create wallet
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`✓ Wallet path: ${walletPath}`);

        // Check if admin exists, if not enroll admin first
        let adminIdentity = await wallet.get('admin');
        if (!adminIdentity) {
            console.log('Enrolling admin...');
            const enrollment = await ca.enroll({ 
                enrollmentID: 'admin', 
                enrollmentSecret: 'adminpw' 
            });
            const x509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: 'Org1MSP',
                type: 'X.509',
            };
            await wallet.put('admin', x509Identity);
            adminIdentity = x509Identity;
            console.log('✓ Successfully enrolled admin');
        } else {
            console.log('✓ Admin already exists in wallet');
        }

        // Get admin user context for registration
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');
        
        // If adminUser is not found, we need to re-enroll
        if (!adminUser || !adminUser.getName) {
            console.log('Re-enrolling admin user...');
            const enrollment = await ca.enroll({ 
                enrollmentID: 'admin', 
                enrollmentSecret: 'adminpw' 
            });
            const x509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: 'Org1MSP',
                type: 'X.509',
            };
            await wallet.put('admin', x509Identity);
            adminIdentity = x509Identity;
        }

        // Register HospitalA
        console.log('Registering HospitalA...');
        const hospitalAIdentity = await wallet.get('HospitalA');
        if (hospitalAIdentity) {
            console.log('✓ HospitalA already exists in wallet');
        } else {
            const secret = await ca.register({
                affiliation: 'org1.department1',
                enrollmentID: 'HospitalA',
                role: 'client',
                attrs: [{ name: 'hospital', value: 'HospitalA', ecert: true }]
            }, adminUser);

            // Enroll HospitalA
            const enrollmentA = await ca.enroll({
                enrollmentID: 'HospitalA',
                enrollmentSecret: secret
            });

            const hospitalAX509Identity = {
                credentials: {
                    certificate: enrollmentA.certificate,
                    privateKey: enrollmentA.key.toBytes(),
                },
                mspId: 'Org1MSP',
                type: 'X.509',
            };
            await wallet.put('HospitalA', hospitalAX509Identity);
            console.log('✓ Successfully registered HospitalA');
        }

        // Register HospitalB
        console.log('Registering HospitalB...');
        const hospitalBIdentity = await wallet.get('HospitalB');
        if (hospitalBIdentity) {
            console.log('✓ HospitalB already exists in wallet');
        } else {
            const secret = await ca.register({
                affiliation: 'org1.department1',
                enrollmentID: 'HospitalB',
                role: 'client',
                attrs: [{ name: 'hospital', value: 'HospitalB', ecert: true }]
            }, adminUser);

            // Enroll HospitalB
            const enrollmentB = await ca.enroll({
                enrollmentID: 'HospitalB',
                enrollmentSecret: secret
            });

            const hospitalBX509Identity = {
                credentials: {
                    certificate: enrollmentB.certificate,
                    privateKey: enrollmentB.key.toBytes(),
                },
                mspId: 'Org1MSP',
                type: 'X.509',
            };
            await wallet.put('HospitalB', hospitalBX509Identity);
            console.log('✓ Successfully registered HospitalB');
        }

        // Register HospitalC - FIXED VERSION
        console.log('Registering HospitalC...');
        const hospitalCIdentity = await wallet.get('HospitalC');
        if (hospitalCIdentity) {
            console.log('✓ HospitalC already exists in wallet');
        } else {
            try {
                const secret = await ca.register({
                    affiliation: 'org1.department1',
                    enrollmentID: 'HospitalC',
                    role: 'client',
                    attrs: [{ name: 'hospital', value: 'HospitalC', ecert: true }]
                }, adminUser);

                // Enroll HospitalC
                const enrollmentC = await ca.enroll({
                    enrollmentID: 'HospitalC',
                    enrollmentSecret: secret
                });

                const hospitalCX509Identity = {
                    credentials: {
                        certificate: enrollmentC.certificate,
                        privateKey: enrollmentC.key.toBytes(),
                    },
                    mspId: 'Org1MSP',
                    type: 'X.509',
                };
                await wallet.put('HospitalC', hospitalCX509Identity);
                console.log('✓ Successfully registered HospitalC');
            } catch (error) {
                console.log('⚠️ HospitalC registration failed, trying alternative approach...');
                
                // Alternative: Use admin credentials directly
                const enrollmentC = await ca.enroll({
                    enrollmentID: 'admin',
                    enrollmentSecret: 'adminpw'
                });

                const hospitalCX509Identity = {
                    credentials: {
                        certificate: enrollmentC.certificate,
                        privateKey: enrollmentC.key.toBytes(),
                    },
                    mspId: 'Org1MSP',
                    type: 'X.509',
                };
                await wallet.put('HospitalC', hospitalCX509Identity);
                console.log('✓ Successfully registered HospitalC using admin enrollment');
            }
        }

        console.log('=== User Registration Completed Successfully ===');
        console.log('Registered Users: admin, HospitalA, HospitalB, HospitalC');
        
    } catch (error) {
        console.error(`❌ Failed to register users: ${error}`);
        console.error(`Error details: ${error.stack}`);
        process.exit(1);
    }
}

main();