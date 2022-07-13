const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { groth16, plonk } = require("snarkjs");

const wasm_tester = require("circom_tester").wasm;

const F1Field = require("ffjavascript").F1Field;
const Scalar = require("ffjavascript").Scalar;
exports.p = Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const Fr = new F1Field(exports.p);

describe("HelloWorld", function () {
    this.timeout(100000000);
    let Verifier;
    let verifier;

    beforeEach(async function () {
        Verifier = await ethers.getContractFactory("HelloWorldVerifier");
        verifier = await Verifier.deploy();
        await verifier.deployed();
    });

    it("Circuit should multiply two numbers correctly", async function () {
        const circuit = await wasm_tester("contracts/circuits/HelloWorld.circom");

        const INPUT = {
            "a": 2,
            "b": 3
        }

        const witness = await circuit.calculateWitness(INPUT, true);

        //console.log(witness);

        assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
        assert(Fr.eq(Fr.e(witness[1]),Fr.e(6)));

    });

    it("Should return true for correct proof", async function () {
        //[assignment] Add comments to explain what each line is doing
        
        // create a goroth16 proof from an input, wasm file, zkey file 
        const { proof, publicSignals } = await groth16.fullProve({"a":"2","b":"3"}, "contracts/circuits/HelloWorld/HelloWorld_js/HelloWorld.wasm","contracts/circuits/HelloWorld/circuit_final.zkey");
        // print the first item of publicSignals
        console.log('2x3 =',publicSignals[0]);
        // create calldata for the solidity contract from proof and publicSignals
        const calldata = await groth16.exportSolidityCallData(proof, publicSignals);
        // replace arguments in the calldata to Bignumber string
        const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());
        // generate parameters for verifying
        const a = [argv[0], argv[1]];
        const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
        const c = [argv[6], argv[7]];
        // assign the remaining items to Input
        const Input = argv.slice(8);
        // expect that this verifyproof function returns true meaning the proof is valid proof
        expect(await verifier.verifyProof(a, b, c, Input)).to.be.true;
    });
    it("Should return false for invalid proof", async function () {
        let a = [0, 0];
        let b = [[0, 0], [0, 0]];
        let c = [0, 0];
        let d = [0]
        expect(await verifier.verifyProof(a, b, c, d)).to.be.false;
    });
});


describe("Multiplier3 with Groth16", function () {
    this.timeout(100000000);
    let Verifier;
    let verifier;

    beforeEach(async function () {
        Verifier = await ethers.getContractFactory("Multiplier3Verifier");
        verifier = await Verifier.deploy();
        await verifier.deployed(); 
    });

    it("Circuit should multiply three numbers correctly", async function () {
      const circuit = await wasm_tester("contracts/circuits/Multiplier3.circom");

      const INPUT = {
          "a": 2,
          "b": 3,
          "c": 5,
      }

      const witness = await circuit.calculateWitness(INPUT, true);

      // console.log(witness);

      assert(Fr.eq(Fr.e(witness[0]),Fr.e(1)));
      assert(Fr.eq(Fr.e(witness[1]),Fr.e(30)));
    });

    it("Should return true for correct proof", async function () {
        const { proof, publicSignals } = await groth16.fullProve({"a":"2","b":"3","c":"5"}, "contracts/circuits/Multiplier3/Multiplier3_js/Multiplier3.wasm","contracts/circuits/Multiplier3/circuit_final.zkey");

        // console.log('2x3x5 =',publicSignals[0]);
        
        const calldata = await groth16.exportSolidityCallData(proof, publicSignals);
    
        const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());        

        const a = [argv[0], argv[1]];
        const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
        const c = [argv[6], argv[7]];
        //console.log(argv)
        const Input = argv.slice(8);

        expect(await verifier.verifyProof(a, b, c, Input)).to.be.true;
    });

    it("Should return false for invalid proof", async function () {
        let a = [0, 0];
        let b = [[0, 0], [0, 0]];
        let c = [0, 0];
        let d = [0];
        expect(await verifier.verifyProof(a, b, c, d)).to.be.false;
    });
});


describe("Multiplier3 with PLONK", function () {

    beforeEach(async function () {
        Verifier = await ethers.getContractFactory("PlonkVerifier");
        verifier = await Verifier.deploy();
        await verifier.deployed(); 
    });

    it("Should return true for correct proof", async function () {
        const { proof, publicSignals } = await plonk.fullProve({"a":"2","b":"3","c":"5"}, "contracts/circuits/Multiplier3_plonk/Multiplier3_js/Multiplier3.wasm","contracts/circuits/Multiplier3_plonk/circuit_final.zkey");

        // console.log('2x3x5 =',publicSignals[0]);
        
        const calldata = await plonk.exportSolidityCallData(proof, publicSignals);
        // console.log(calldata);   
        // const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());        
 
        // const a = [argv[0], argv[1]];
        // const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
        // const c = [argv[6], argv[7]];
        // //console.log(argv)
        // const Input = argv.slice(8);

        expect(await verifier.verifyProof(calldata.split(",")[0], publicSignals)).to.be.true;
    });
    
    it("Should return false for invalid proof", async function () {
        expect(await verifier.verifyProof("0x00", ["30"])).to.be.false;
    });
});