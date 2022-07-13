const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { plonk } = require("snarkjs");

const wasm_tester = require("circom_tester").wasm;

const F1Field = require("ffjavascript").F1Field;
const Scalar = require("ffjavascript").Scalar;
exports.p = Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const Fr = new F1Field(exports.p);

describe("LessThan10 verifier test", function () {
    let Verifier;
    let verifier;

    beforeEach(async function () {
        Verifier = await ethers.getContractFactory("PlonkVerifier");
        verifier = await Verifier.deploy();
        await verifier.deployed();
    });

    it("Should return true for correct proof", async function () {
        //[assignment] Add comments to explain what each line is doing
        const { proof, publicSignals } = await plonk.fullProve({in: 6},
            "contracts/circuits/LessThan10/LessThan10_js/LessThan10.wasm","contracts/circuits/LessThan10/circuit_final.zkey");

        const calldata = await plonk.exportSolidityCallData(proof, publicSignals);
        // console.log(calldata);
        console.log(publicSignals[0]); // 1 for true, 0 for false
        expect(await verifier.verifyProof(calldata.split(',')[0], publicSignals)).to.be.true;
    });
});