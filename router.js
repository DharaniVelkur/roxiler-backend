const express = require("express");
const data = require("./models/productSchema");
const router = new express.Router();
const axios = require("axios");

router.get("/initialize-database", async (req, res) => {
  try {
    const response = await fetch(
      "https://s3.amazonaws.com/roxiler.com/product_transaction.json"
    );
    const datap = await response.json();
    await data.insertMany(datap);
    return res.status(200).json({ message: "Database initialized with seed data" });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "An error occurred during database initialization" });
  }
});

router.get("/salesByMonth/:month", async (req, res) => {
  try {
    const { month } = req.params;
    const salesData = await data.find({
      $expr: {
        $eq: [
          { $month: { date: "$dateOfSale", timezone: "+05:30" } },
          parseInt(month, 10),
        ],
      },
    });
    return res.json(salesData);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/transactions", async (req, res) => {
  try {
    const { search , page = 1, perPage = 10, month } = req.query;
    let filter = [];
    if (search) {
      filter.push({
        $or: [
          { title: {$regex: search, $options: "i" } }, 
          { description: { $regex: search, $options: "i" } },
          { price: parseFloat(search) },
        ],
      });
    }
    if (month) {
      filter.push({
        $expr: {
          $eq: [
            { $month:"$dateOfSale"},
            parseInt(month, 10),
          ]
        }
      });
    }

    const totalcount = await data.countDocuments(filter.length > 0 ? { $and: filter } : {});
    const transactions = await data.find(filter.length > 0 ? { $and: filter } : {}).skip((page - 1) * perPage).limit(parseInt(perPage, 10));
      return res.json({
        total: totalcount,
        page: parseInt(page),
        perPage: parseInt(perPage),
        transactions
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
});

router.get('/statistics', async (req, res) => {
    try {
        let {month=3} =req.query;
        let filter = dataOfSale={
                $expr: {
                    $eq: [
                      { $month: "$dateOfSale" },
                      parseInt(month, 10)
                    ]
                  }
            }
        
        const totalSaleAmount= await data.aggregate([
            {
                $match: filter
            },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$price" }
                }
            }
        ]);
        const soldItemsCount = await data.countDocuments({ ...filter, sold: true });
        const unsoldItemsCount = await data.countDocuments({ ...filter, sold: false }); 
        return res.json({
            totalSaleAmount: (totalSaleAmount[0] && totalSaleAmount[0].totalAmount) || 0,
            soldItemsCount,
            unsoldItemsCount
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
})

router.get('/barchart', async (req, res) => {
    try {
        const { month } = req.query;
        const matchQuery = {
            $expr: { $eq: [{ $month: "$dateOfSale" }, parseInt(month, 10)] }
        };
        const priceRanges =[
            {min:0,max:100},
            {min:101,max:200},
            {min:201,max:300},
            {min:301,max:400},
            {min:401,max:500},
            {min:501,max:600},
            {min:601,max:700},
            {min:701,max:800},
            {min:801,max:900},
        ]
        const aggregationpipeline=[];
        aggregationpipeline.push({$match:matchQuery});
        aggregationpipeline.push({
            $group: {
                _id:{
                    $switch:{
                        branches: priceRanges.map((range,index)=>({
                            case:{
                                $and:[{$gte:["$price",range.min]},{$lt:["$price",range.max]}]
                            },
                            then: index
                        })),
                        default:priceRanges.length
                    }
                },
                count:{$sum:1}
            }
        });

        const result =await data.aggregate(aggregationpipeline);
        const formattedResult = result.map(e=>({
            priceRange: e._id === priceRanges.length ? 'Above ' + priceRanges[priceRanges.length-1].max: `$${priceRanges[e._id].min} - $${priceRanges[e._id].max}`,
            itemCount: e.count
        }));
        return res.json(formattedResult);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
})

router.get('/piechart',async (req,res)=>{
    try {
        const {month} =req.query;
        const matchQuery = {
            $expr: { $eq: [{ $month: "$dateOfSale" }, parseInt(month, 10)] }
        };
        const aggregationPipeline = [];
        aggregationPipeline.push({ $match: matchQuery });
        aggregationPipeline.push({
            $group: {
                _id: "$category",
                itemCount: { $sum: 1 }
            }
        });
        const result =await data.aggregate(aggregationPipeline);
        const formattedResult = result.map(({ _id, itemCount }) => ({
            [`${_id} category`]: itemCount
        }));
        return res.json(formattedResult);
    } catch (error) {
        return res.status(500).json({error: error.message});
    }
});

router.get("/combineddata",async (req, res) => {
  const { search, page = 1, perPage = 10, month } = req.query;
    try {
        const [transactions,statistics,piechart,barchart] = await Promise.all([
            axios.get(`https://roxiler-server.onrender.com/transactions?month=${month}&search=${search}`),
            axios.get(`https://roxiler-server.onrender.com/statistics?month=${month}`),
            axios.get(`https://roxiler-server.onrender.com/piechart?month=${month}`),
            axios.get(`https://roxiler-server.onrender.com/barchart?month=${month}`)
        ]);
        const transactionsData = transactions.data;
        const statisticsData = statistics.data;
        const pieChartData = piechart.data;
        const barchartData = barchart.data;


        // Combine the responses into a single object
        const combinedData = {
            transactions: transactionsData,
            statistics: statisticsData,
            pieChart: pieChartData,
            barChart: barchartData
        };

      return  res.json(combinedData);
    } catch (error) {
       return res.json({error:error.message});
    }
})

module.exports = router;
