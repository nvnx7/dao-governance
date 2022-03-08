const { expect } = require("chai");
const { ethers } = require("hardhat");

const { BigNumber, utils } = ethers;

const dAppName = "TestDApp";
const tokenParams = { name: "TestToken", symbol: "TTK" };
const timelockParams = { minDelay: 600, proposers: [], executors: [] };
const governorParams = {
  name: dAppName,
  votingDelay: 10, // in blocks
  votingPeriod: 50, // in blocks
  proposalThreshold: 0,
  quorumFraction: 4,
};
const ProposalState = {
  Pending: 0,
  Active: 1,
  Canceled: 2,
  Defeated: 3,
  Succeeded: 4,
  Queued: 5,
  Expired: 6,
  Executed: 7,
};
const Roles = {
  PROPOSER_ROLE: "",
  EXECUTOR_ROLE: "",
};
const VoteType = {
  Against: 0,
  For: 1,
  Abstain: 2,
};

const mock = {
  targets: [],
  values: [0],
  datas: [],
  description: "mock proposal",
  descriptionHash: utils.id("mock proposal"),
  targetStoreValue: 5,
};

const proposalParams = () => [
  mock.targets,
  mock.values,
  mock.datas,
  mock.description,
];

const executionParams = () => [
  mock.targets,
  mock.values,
  mock.datas,
  mock.descriptionHash,
];

const increaseTime = async (sec) => {
  await ethers.provider.send("evm_increaseTime", [sec]);
  await ethers.provider.send("evm_mine");
};
const advanceBlock = () => ethers.provider.send("evm_mine");
const advanceBlockBy = (n) =>
  Promise.all(Array.from({ length: n }).map(advanceBlock));

describe("DAO_ERC721Votes", function () {
  before(async function () {
    this.GovernanceToken = await ethers.getContractFactory("DaoNFT");
    this.GovernanceTimelock = await ethers.getContractFactory("DaoTimelock");
    this.Governor = await ethers.getContractFactory("DaoGovernor");
    this.Target = await ethers.getContractFactory("Target");
  });

  beforeEach(async function () {
    this.signers = await ethers.getSigners();
    this.voters = this.signers.slice(1, 11);

    this.token = await this.GovernanceToken.deploy(
      tokenParams.name,
      tokenParams.symbol
    );

    await Promise.all(
      this.voters.map((voter, i) => this.token.mint(voter.address, i))
    );
    await Promise.all(
      this.voters.map((voter) =>
        this.token.connect(voter).delegate(voter.address)
      )
    );

    this.timelock = await this.GovernanceTimelock.deploy(
      timelockParams.minDelay,
      timelockParams.proposers,
      timelockParams.executors
    );
    this.governor = await this.Governor.deploy(
      governorParams.name,
      governorParams.votingDelay,
      governorParams.votingPeriod,
      governorParams.proposalThreshold,
      this.token.address,
      governorParams.quorumFraction,
      this.timelock.address
    );
    this.target = await this.Target.deploy();

    Roles.PROPOSER_ROLE = await this.timelock.PROPOSER_ROLE();
    Roles.EXECUTOR_ROLE = await this.timelock.EXECUTOR_ROLE();

    this.timelock.grantRole(Roles.PROPOSER_ROLE, this.governor.address);
    this.timelock.grantRole(Roles.EXECUTOR_ROLE, ethers.constants.AddressZero);

    mock.targets = [this.target.address];
    mock.datas = [
      this.target.interface.encodeFunctionData("store", [
        mock.targetStoreValue,
      ]),
    ];
  });

  describe("Deployment", function () {
    it("deploys without errors", async function () {
      expect(
        await this.timelock.hasRole(Roles.PROPOSER_ROLE, this.governor.address)
      ).to.be.true;
      expect(
        await this.timelock.hasRole(
          Roles.EXECUTOR_ROLE,
          ethers.constants.AddressZero
        )
      ).to.be.true;
    });
  });

  describe("Proposal", function () {
    beforeEach(async function () {
      const tx = await this.governor.propose(...proposalParams());
      this.proposalArgs = await tx.wait().then((r) => r.events[0].args);
    });

    it("correct proposal hash/id", async function () {
      const params = proposalParams();
      params[params.length - 1] = mock.descriptionHash;

      expect(await this.governor.hashProposal(...params)).to.be.equal(
        this.proposalArgs.proposalId
      );
    });

    it("correct pending/active/defeated proposal states", async function () {
      expect(
        await this.governor.state(this.proposalArgs.proposalId)
      ).to.be.equal(ProposalState.Pending);

      await advanceBlockBy(governorParams.votingDelay + 1);
      expect(
        await this.governor.state(this.proposalArgs.proposalId)
      ).to.be.equal(ProposalState.Active);

      await advanceBlockBy(governorParams.votingPeriod);
      expect(
        await this.governor.state(this.proposalArgs.proposalId)
      ).to.be.equal(ProposalState.Defeated);
    });

    it("cannot vote before proposal active", async function () {
      const [voter] = this.voters;
      await expect(
        this.governor
          .connect(voter)
          .castVote(this.proposalArgs.proposalId, VoteType.For)
      ).to.be.revertedWith("Governor: vote not currently active");
    });

    it("cannot queue before proposal active", async function () {
      await expect(
        this.governor.execute(...executionParams())
      ).to.be.revertedWith("Governor: proposal not successful");
    });

    it("cannot execute before proposal active", async function () {
      await expect(
        this.governor.execute(...executionParams())
      ).to.be.revertedWith("Governor: proposal not successful");
    });
  });

  describe("Voting", async function () {
    beforeEach(async function () {
      const tx = await this.governor.propose(...proposalParams());
      this.proposalArgs = await tx.wait().then((r) => r.events[0].args);

      // Make voting active
      await advanceBlockBy(governorParams.votingDelay + 1);
      expect(
        await this.governor.state(this.proposalArgs.proposalId)
      ).to.be.equal(ProposalState.Active);
    });

    it("can vote on active proposal", async function () {
      const [voter, nonVoter] = this.voters;
      await expect(
        this.governor
          .connect(voter)
          .castVote(this.proposalArgs.proposalId, VoteType.For)
      ).to.not.be.reverted;

      expect(
        await this.governor.hasVoted(
          this.proposalArgs.proposalId,
          voter.address
        )
      ).to.be.equal(true);

      expect(
        await this.governor.hasVoted(
          this.proposalArgs.proposalId,
          nonVoter.address
        )
      ).to.be.equal(false);
    });

    it("correct vote counts", async function () {
      const { proposalId } = this.proposalArgs;
      const [
        forVoter1,
        forVoter2,
        forVoter3,
        againstVoter1,
        againstVoter2,
        abstainVoter,
      ] = this.voters;

      await this.governor.connect(forVoter1).castVote(proposalId, VoteType.For);
      await this.governor.connect(forVoter2).castVote(proposalId, VoteType.For);
      await this.governor.connect(forVoter3).castVote(proposalId, VoteType.For);
      await this.governor
        .connect(againstVoter1)
        .castVote(proposalId, VoteType.Against);
      await this.governor
        .connect(againstVoter2)
        .castVote(proposalId, VoteType.Against);
      await this.governor
        .connect(abstainVoter)
        .castVote(proposalId, VoteType.Abstain);

      await advanceBlockBy(governorParams.votingPeriod);

      expect(await this.governor.state(proposalId)).to.be.equal(
        ProposalState.Succeeded
      );

      const votes = await this.governor.proposalVotes(proposalId);
      expect(votes.forVotes).to.be.equal(BigNumber.from(3));
      expect(votes.againstVotes).to.be.equal(BigNumber.from(2));
      expect(votes.abstainVotes).to.be.equal(BigNumber.from(1));
    });

    it("voted proposal succeeded", async function () {
      const { proposalId } = this.proposalArgs;
      const [
        forVoter1,
        forVoter2,
        forVoter3,
        againstVoter1,
        againstVoter2,
        abstainVoter,
      ] = this.voters;

      await this.governor.connect(forVoter1).castVote(proposalId, VoteType.For);
      await this.governor.connect(forVoter2).castVote(proposalId, VoteType.For);
      await this.governor.connect(forVoter3).castVote(proposalId, VoteType.For);
      await this.governor
        .connect(againstVoter1)
        .castVote(proposalId, VoteType.Against);
      await this.governor
        .connect(againstVoter2)
        .castVote(proposalId, VoteType.Against);
      await this.governor
        .connect(abstainVoter)
        .castVote(proposalId, VoteType.Abstain);

      await advanceBlockBy(governorParams.votingPeriod);

      expect(await this.governor.state(proposalId)).to.be.equal(
        ProposalState.Succeeded
      );
    });

    it("voted proposal defeated", async function () {
      const { proposalId } = this.proposalArgs;
      const [forVoter1, againstVoter1, againstVoter2, abstainVoter] =
        this.voters;

      await this.governor.connect(forVoter1).castVote(proposalId, VoteType.For);
      await this.governor
        .connect(againstVoter1)
        .castVote(proposalId, VoteType.Against);
      await this.governor
        .connect(againstVoter2)
        .castVote(proposalId, VoteType.Against);
      await this.governor
        .connect(abstainVoter)
        .castVote(proposalId, VoteType.Abstain);

      await advanceBlockBy(governorParams.votingPeriod);
      expect(await this.governor.state(proposalId)).to.be.equal(
        ProposalState.Defeated
      );
    });
  });

  describe("Execution", async function () {
    beforeEach(async function () {
      const tx = await this.governor.propose(...proposalParams());
      this.proposalArgs = await tx.wait().then((r) => r.events[0].args);

      const { proposalId } = this.proposalArgs;

      // Make voting active
      await advanceBlockBy(governorParams.votingDelay + 1);
      expect(await this.governor.state(proposalId)).to.be.equal(
        ProposalState.Active
      );

      // Succeed proposal
      await this.governor
        .connect(this.voters[0])
        .castVote(proposalId, VoteType.For);

      await advanceBlockBy(governorParams.votingPeriod);

      expect(await this.governor.state(proposalId)).to.be.equal(
        ProposalState.Succeeded
      );
    });

    it("queue succeeded proposal", async function () {
      const { proposalId } = this.proposalArgs;
      await expect(this.governor.queue(...executionParams())).to.not.be
        .reverted;

      expect(await this.governor.state(proposalId)).to.be.equal(
        ProposalState.Queued
      );
    });

    it("denies execution before timelock delay", async function () {
      const { proposalId } = this.proposalArgs;
      await expect(this.governor.queue(...executionParams())).to.not.be
        .reverted;

      expect(await this.governor.state(proposalId)).to.be.equal(
        ProposalState.Queued
      );

      await expect(
        this.governor.execute(...executionParams())
      ).to.be.revertedWith("TimelockController: operation is not ready");
    });

    it("allows execution after timelock delay", async function () {
      const { proposalId } = this.proposalArgs;
      await expect(this.governor.queue(...executionParams())).to.not.be
        .reverted;

      expect(await this.governor.state(proposalId)).to.be.equal(
        ProposalState.Queued
      );

      await increaseTime(timelockParams.minDelay);
      await expect(this.governor.execute(...executionParams())).to.not.be
        .reverted;

      expect(await this.governor.state(proposalId)).to.be.equal(
        ProposalState.Executed
      );

      // Check effects on target address
      expect(await this.target.retrieve()).to.be.equal(mock.targetStoreValue);
    });
  });
});
