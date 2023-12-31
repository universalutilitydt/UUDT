require("dotenv").config();
require("./config/db");
const express = require("express");
const cors = require("cors");
const schedule = require("node-schedule");
const app = express();
app.use(cors());
const routes = require("./routes/index");
const Usermodal = require("./models/user");
const Stakingmodal = require("./models/Staking");
const {
  findAllRecord,
  updateRecord,
  findOneRecord,
} = require("./library/commonQueries");
const Walletmodal = require("./models/Wallet");
const Stakingbonus = require("./models/Stakingbonus");
const Mainwallatesc = require("./models/Mainwallate");
const Achivement = require("./models/Achivement");
const { ObjectId } = require("mongodb");
const Passive = require("./models/Passive");

app.use(
  express.json({
    limit: "100024mb",
  })
);
app.use(
  express.urlencoded({
    limit: "100024mb",
    extended: true,
  })
);

app.use("/api", routes);
const every24hours = "0 19 * * *";
schedule.scheduleJob(every24hours, async () => {
  try {
    const stakingRecords = await findAllRecord(Stakingmodal);
    for (const record of stakingRecords) {
      if (record) {
        const elapsedTimeInDays = await Stakingbonus.aggregate([
          {
            $match: {
              rewordId: ObjectId(record._id),
              Note: "You Got Staking Bonus Income.",
            },
          },
        ]);
        if (elapsedTimeInDays.length < 365) {
          const updatedWallet = await updateRecord(
            Walletmodal,
            { userId: record.userId },
            { $inc: { mainWallet: record.DailyReword } }
          );

          if (updatedWallet) {
            await Promise.all([
              Mainwallatesc({
                userId: record.userId,
                Note: "You Got Staking Bonus Income.",
                Amount: record.DailyReword,
                type: 1,
                balace: updatedWallet.mainWallet,
                Active: true,
              }).save(),
              Stakingbonus({
                userId: record.userId,
                rewordId: record._id,
                Amount: record.DailyReword,
                Note: "You Got Staking Bonus Income.",
                Active: true,
              }).save(),
              updateRecord(
                Stakingmodal,
                { _id: record._id },
                {
                  TotalRewordRecived:
                    record.TotalRewordRecived - record.DailyReword,
                  TotaldaysTosendReword: record.TotaldaysTosendReword - 1,
                  $inc: { Totalsend: 1 },
                }
              ),
            ]);
          }
        } else {
          await Promise.all([
            Stakingbonus({
              userId: record.userId,
              rewordId: record._id,
              Amount: 0,
              Note: "Your staking plan period is completed. You have received your bonus as per the return.",
              Active: false,
            }).save(),
            updateRecord(
              Stakingmodal,
              { userId: record.userId },
              {
                Active: false,
              }
            ),
          ]);
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
});
const updateRank = async (user, newRank, rewardAmount, teamtotalstack) => {
  console.log("user", user);
  let data = await findOneRecord(Usermodal, {
    _id: user._id,
    Rank: user.Rank,
    teamtotalstack: { $gt: teamtotalstack },
  });
  console.log("data", data);
  await updateRecord(
    Usermodal,
    {
      _id: user._id,
      Rank: user.Rank,
      teamtotalstack: { $gt: teamtotalstack },
    },
    { Rank: newRank }
  );

  const da = await findAllRecord(Usermodal, {
    _id: user._id,
    Rank: newRank,
  });

  if (da.length > 0) {
    let data = {
      userId: user._id,
      Note: `${rewardAmount} USDT Token WILL BE CREDITED IN ACHEIVER WALLET`,
      Amount: rewardAmount,
    };

    await updateRecord(
      Walletmodal,
      {
        userId: user._id,
      },
      {
        $inc: {
          mainWallet: rewardAmount,
        },
      }
    ).then(async (res) => {
      await Mainwallatesc({
        userId: user._id,
        Note: `${rewardAmount} USDT Token WILL BE CREDITED IN ACHEIVER WALLET`,
        Amount: rewardAmount,
        type: 1,
        balace: res?.mainWallet,
        Active: true,
      }).save();
      await Achivement(data).save();
    });
  }
};
const every24hours1 = "10 19 * * *";
schedule.scheduleJob("*/5 * * * *", async () => {
  try {
    const Userdata = await findAllRecord(Usermodal, {});
    for (const user of Userdata) {
      await Usermodal.aggregate([
        {
          $match: {
            username: user.username,
          },
        },
      ]).then(async (res) => {
        if (res.length > 0) {
          switch (res[0]?.Rank) {
            case "DIRECT":
              const Refflevalncome = await findAllRecord(Usermodal, {
                refferalBy: res[0].username,
                Rank: "DIRECT",
              });
              if (Refflevalncome.length >= 4) {
                console.log(Refflevalncome);
                await updateRank(res[0], "EXECUTIVE", 50, 2500);
              }
              break;
            case "EXECUTIVE":
              const Refflevalncome1 = await findAllRecord(Usermodal, {
                refferalBy: res[0].username,
                Rank: "EXECUTIVE",
              });
              if (Refflevalncome1.length >= 2) {
                await updateRank(res[0], "Sales EXECUTIVE", 100, 10000);
              }
              break;
            case "Sales EXECUTIVE":
              const Refflevalncome2 = await findAllRecord(Usermodal, {
                refferalBy: res[0].username,
                Rank: "Sales EXECUTIVE",
              });
              if (Refflevalncome2.length >= 2) {
                await updateRank(res[0], "AREA SALES MANAGER", 250, 40000);
              }
              break;
            case "AREA SALES MANAGER":
              const Refflevalncome3 = await findAllRecord(Usermodal, {
                refferalBy: res[0].username,
                Rank: "AREA SALES MANAGER",
              });
              if (Refflevalncome3.length >= 2) {
                await updateRank(res[0], "Zonal HEAD", 500, 160000);
              }
              break;
            case "Zonal HEAD":
              const Refflevalncome4 = await findAllRecord(Usermodal, {
                refferalBy: res[0].username,
                Rank: "Zonal HEAD",
              });
              if (Refflevalncome4.length >= 2) {
                await updateRank(res[0], "PROJECT HEAD", 1500, 5000000);
              }
              break;
            case "PROJECT HEAD":
              const Refflevalncome5 = await findAllRecord(Usermodal, {
                refferalBy: res[0].username,
                Rank: "PROJECT HEAD",
              });
              if (Refflevalncome5.length >= 2) {
                await updateRank(
                  res[0],
                  "Sr. Project Head",
                  5000,
                  308480
                );
              }
              break;
            case "Sr. Project Head":
              const Refflevalncome6 = await findAllRecord(Usermodal, {
                refferalBy: res[0].username,
                Rank: "Sr. Project Head",
              });
              if (Refflevalncome6.length >= 2) {
                await updateRank(res[0], "COM-B", 15000, 10000000);
              }
              break;
            case "COM-B":
              const Refflevalncome7 = await findAllRecord(Usermodal, {
                refferalBy: res[0].username,
                Rank: "COM-B",
              });
              if (Refflevalncome7.length >= 2) {
                await updateRank(res[0], "COM-A", 75000, 30000000);
              }
              break;
            case "COM-A":
              const Refflevalncome8 = await findAllRecord(Usermodal, {
                refferalBy: res[0].username,
                Rank: "COM-A",
              });
              if (Refflevalncome8.length >= 2) {
                await updateRank(res[0], "TRUST", 150000, 6000000);
              }
              break;
            case "TRUST":
              const Refflevalncome9 = await findAllRecord(Usermodal, {
                refferalBy: res[0].username,
                Rank: "TRUST",
              });
              if (Refflevalncome9.length >= 2) {
                await updateRank(res[0], "CORE TEAM", 500000, 10000000);
              }
              break;
            default:
              break;
          }
        }
      });
    }
  } catch (error) {
    console.log(error);
  }
});
const getUserIncomeMultiplier = (rank) => {
  switch (rank) {
    case "EXECUTIVE":
      return 9;
    case "Sales EXECUTIVE":
      return 8;
    case "AREA SALES MANAGER":
      return 7;
    case "Zonal HEAD":
      return 6;
    case "PROJECT HEAD":
      return 5;
    case "Sr. Project Head":
      return 4;
    case "COM-B":
      return 3;
    case "COM-A":
      return 2;
    case "TRUST":
      return 1;
    default:
      return 0.5;
  }
};
schedule.scheduleJob(every24hours1, async () => {
  try {
    const result12 = await Usermodal.aggregate([
      {
        $match: {
          Rank: { $ne: "DIRECT" },
          mystack: { $ne: 0 },
        },
      },
      {
        $graphLookup: {
          from: "users",
          startWith: "$username",
          connectFromField: "username",
          connectToField: "refferalBy",
          as: "refers_to",
        },
      },
      {
        $lookup: {
          from: "stakings",
          localField: "refers_to._id",
          foreignField: "userId",
          as: "stackingdata",
        },
      },
      {
        $match: {
          "stackingdata.amount": { $ne: [] },
          "stackingdata.at": { $ne: [] },
        },
      },
      {
        $project: {
          stackingdata: {
            $filter: {
              input: "$stackingdata",
              as: "d",
              cond: {
                $gte: ["$$d.Active", true],
              },
            },
          },
          username: 1,
          Rank: 1,
          level: 1,
        },
      },
    ]);
    if (result12.length > 0) {
      for (const result of result12) {
        const dd = getUserIncomeMultiplier(result.Rank);
        for (const d of result.stackingdata) {
          const incomeAmount = (d.DailyReword * dd) / 100;
          if (d.Active === true) {
            const Refflevalncome = await findOneRecord(Usermodal, {
              _id: d.userId,
            });
            const data = {
              userId: result._id,
              username: Refflevalncome?.username,
              Note: "USDT Token WILL BE CREDITED IN PASSIVE CLUB WALLET",
              Amount: incomeAmount,
            };
            await updateRecord(
              Walletmodal,
              { userId: result._id },
              {
                $inc: {
                  mainWallet: incomeAmount,
                },
              }
            ).then(async (res1) => {
              await Mainwallatesc({
                userId: result._id,
                Note: `USDT Token WILL BE CREDITED IN PASSIVE CLUB WALLET ${Refflevalncome?.username}`,
                Amount: incomeAmount,
                type: 1,
                balace: res1?.mainWallet,
                Active: true,
              }).save();
            });
            await Passive(data).save();
          }
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
});
schedule.scheduleJob("*/5 * * * *", async () => {
  try {
    const Userdata = await findAllRecord(Usermodal, {});
    for (const user of Userdata) {
      const { _id: userId, username } = user;
      Usermodal.aggregate([
        {
          $match: {
            username,
          },
        },
        {
          $graphLookup: {
            from: "users",
            startWith: "$username",
            connectFromField: "username",
            connectToField: "refferalBy",
            as: "refers_to",
          },
        },
        {
          $lookup: {
            from: "stakings",
            localField: "refers_to._id",
            foreignField: "userId",
            as: "amount2",
          },
        },
        {
          $lookup: {
            from: "stakings",
            localField: "_id",
            foreignField: "userId",
            as: "amount",
          },
        },
        {
          $match: {
            amount: {
              $ne: [],
            },
          },
        },
        {
          $project: {
            total: {
              $reduce: {
                input: "$amount",
                initialValue: 0,
                in: {
                  $add: ["$$value", "$$this.Amount"],
                },
              },
            },
            total1: {
              $reduce: {
                input: "$amount2",
                initialValue: 0,
                in: {
                  $add: ["$$value", "$$this.Amount"],
                },
              },
            },
            total2: {
              $reduce: {
                input: "$amount",
                initialValue: 0,
                in: {
                  $add: [
                    "$$value",
                    {
                      $divide: ["$$this.Amount", "$$this.V4xTokenPrice"],
                    },
                  ],
                },
              },
            },
            email: 1,
            username: 1,
            level: 4,
          },
        },
      ]).then(async (aggregatedUserData) => {
        if (aggregatedUserData.length > 0) {
          await Usermodal.findOneAndUpdate(
            { _id: ObjectId(userId) },
            {
              teamtotalstack: aggregatedUserData[0].total1,
              mystack: aggregatedUserData[0].total,
              lockamount: aggregatedUserData[0].total2,
            }
          );
        }
      });
    }
  } catch (error) {
    console.log(error);
  }
});
schedule.scheduleJob(every24hours, async () => {
  try {
    const Userdata = await findAllRecord(Usermodal, {});
    for (const user of Userdata) {
      if (user.isValid !== true) {
        await Usermodal.findByIdAndDelete({ _id: user._id });
      }
    }
  } catch (error) {
    console.log(error);
  }
});
const maxTimeDifference = 5 * 60 * 1000;
app.get("/", async (req, res) => {
  console.log("Transaction is valid within 5 minutes.");
});
const LOCALPORT = process.env.PORT || 8080;

app.listen(LOCALPORT, () => {
  console.log(`http://localhost:${LOCALPORT} is listening...`);
});
