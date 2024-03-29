const exceljs = require('exceljs')
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const jwt = require('jsonwebtoken')

const {
    Warehouse,
    WarehouseWB,
    Supply,
    NewOrder,
    ReshipmentOrder,
    Income,
    Stock,
    Order,
    Sale,
    ReportDetailByPeriod,
    Add,
    Info,
    ReportThreeMonths,
    ReportMonthly,
    ReportWeekly,
    ReportDaily,
    ReportTwoWeeks,
    Goods,
    InitialCostsAndTax,
    User
} = require('../models/models')
const {
    filterArrays,
    calculateOrders,
    calculateReturn,
    calculateBuyout,
    calculateAverageReceipt,
    calculatePenalty,
    calculateAdditionalPayment,
    calculateCommission,
    calculateDeliveryCost,
    calculateMarginalProfit,
    calculateAverageProfit,
    calculateROI,
    calculateNetProfit,
    calculateGrossProfit,
    calculateToClients,
    calculateMargin,
    calculateCommissionFromProfit,
    calculateCommissionFromDelivery,
    calculatePurchasePercentage,
    abcAnalysis,
    calculateAdvertisementMetrics,
    findFBSFBO,
    calculateNotSorted
} = require('../service/utils')

class DataCollectionController {

    async getBrandNames(req, res) {
        const { id } = req.params
        const user = await User.findOne({ where: { id } });
        const decodedTokens = user.tokens.map(token => ({ brandName: token.brandName, token: jwt.decode(token.token, { complete: true }) }))
        const resTokens = decodedTokens && decodedTokens.length ? decodedTokens.map(token => ({ brandName: token.brandName })) : [];

        const names = resTokens.map(el => el.brandName)
        return res.json(names)
    }

    async getAllForUser(req, res) {
        const { id } = req.params
        const data = await Order.findAll({ where: { userId: id } })
        return res.json(data)
    }

    async getDataCollection(req, res) {
        const { id } = req.params
        const { days, brandName } = req.query

        const startDate = new Date(new Date().getTime() - days * 24 * 60 * 60 * 1000);


        const warehouses = await Warehouse.findOne({ where: { userId: id, brandName } })
        const warehousesWB = await WarehouseWB.findOne({ where: { userId: id, brandName } })
        const supplies = await Supply.findOne({ where: { userId: id, brandName } })
        const newOrders = await NewOrder.findOne({ where: { userId: id, brandName } })
        const reshipmentOrders = await ReshipmentOrder.findOne({ where: { userId: id, brandName } })
        const incomes = await Income.findOne({ where: { userId: id, brandName } })
        const stocks = await Stock.findOne({ where: { userId: id, brandName } })
        const orders = await Order.findOne({ where: { userId: id, brandName } })
        const sales = await Sale.findOne({ where: { userId: id, brandName } })
        const reportDetailByPeriod = await ReportDetailByPeriod.findOne({ where: { userId: id, brandName } })
        const add = await Add.findOne({ where: { userId: id, brandName } })
        const info = await Info.findOne({ where: { userId: id, brandName } })
        const goods = await Goods.findOne({ where: { userId: id, brandName } })
        const reportThreeMonths = await ReportThreeMonths.findOne({ where: { userId: id, brandName } })
        const reportMonthly = await ReportMonthly.findOne({ where: { userId: id, brandName } })
        const reportTwoWeeks = await ReportTwoWeeks.findOne({ where: { userId: id, brandName } })
        const reportWeekly = await ReportWeekly.findOne({ where: { userId: id, brandName } })
        const reportDaily = await ReportDaily.findOne({ where: { userId: id, brandName } })
        const initialCostsAndTax = await InitialCostsAndTax.findOne({ where: { userId: id, brandName } })

        const [
            penalty,
            additionalPayment,
            wbComission,
            logistics,
            marginRevenue,
            lostProfit,
            profit,
            marginCosts,
            netProfit,
            averageProfit,
            roi,
            vpProfitMargin,
            opProfitMargin,
            advertisment,
            commissionFromProfit,
            logisticsFromProfit
        ] = await Promise.all([
            calculatePenalty(reportDetailByPeriod.data, days),
            calculateAdditionalPayment(reportDetailByPeriod.data, days),
            calculateCommission(sales.data, days),
            calculateDeliveryCost(reportDetailByPeriod.data, days),
            calculateMarginalProfit(reportDetailByPeriod.data, days),
            calculateReturn(orders.data, days),
            calculateOrders(sales.data, days),
            calculateMargin(reportDetailByPeriod.data, days),
            calculateNetProfit(reportDetailByPeriod.data, days),
            calculateAverageProfit(sales.data, days),
            calculateROI(reportDetailByPeriod.data, days),
            calculateGrossProfit(sales.data, reportDetailByPeriod.data, days),
            calculateGrossProfit(sales.data, reportDetailByPeriod.data, days),
            calculateAdvertisementMetrics(add.data, calculateOrders(sales.data, days).sum, days),
            calculateCommissionFromProfit(reportDetailByPeriod.data, days),
            calculateCommissionFromDelivery(reportDetailByPeriod.data, days)
        ]);

        const content = {
            chartData: null,
            initialPrice: 0,
            penalty,
            additionalPayment,
            wbComission,
            logistics,
            marginRevenue,
            lostProfit,
            profit,
            marginCosts,
            grossProfit: { sum: profit.sum, percent: 0 },
            tax: { sum: 0, percent: 0 },
            netProfit,
            averageProfit,
            roi,
            vpProfitMargin,
            opProfitMargin,
            yearProfitMargin: null,
            fbo: await findFBSFBO(orders.data, warehouses.data, days),
            fbs: await findFBSFBO(orders.data, warehouses.data, days),
            toClient: stocks.data.filter(i => i.inWayToClient && new Date(i.lastChangeDate) >= startDate),
            fromClient: stocks.data.filter(i => i.inWayFromClient && new Date(i.lastChangeDate) >= startDate),
            notSorted: await calculateNotSorted(stocks.data, days),
            advertisment,
            commissionFromProfit,
            logisticsFromProfit
        };

        return res.json({
            warehouses,
            warehousesWB,
            supplies,
            newOrders,
            reshipmentOrders,
            incomes,
            stocks,
            orders,
            sales,
            reportDetailByPeriod,
            add,
            info,
            goods,
            content,
            reportDaily,
            reportWeekly,
            reportTwoWeeks,
            reportMonthly,
            reportThreeMonths,
            initialCostsAndTax,
        })
    }

    async getFilteredCollection(req, res) {
        const { id } = req.params
        const { days, brandName } = req.query

        const startDate = new Date(new Date().getTime() - days * 24 * 60 * 60 * 1000);

        const warehouses = await Warehouse.findOne({ where: { userId: id, brandName } })
        const warehousesWB = await WarehouseWB.findOne({ where: { userId: id, brandName } })
        const supplies = await Supply.findOne({ where: { userId: id, brandName } })
        const newOrders = await NewOrder.findOne({ where: { userId: id, brandName } })
        const reshipmentOrders = await ReshipmentOrder.findOne({ where: { userId: id, brandName } })
        const incomes = await Income.findOne({ where: { userId: id, brandName } })
        const stocks = await Stock.findOne({ where: { userId: id, brandName } })
        const orders = await Order.findOne({ where: { userId: id, brandName } })
        const sales = await Sale.findOne({ where: { userId: id, brandName } })
        const reportDetailByPeriod = await ReportDetailByPeriod.findOne({ where: { userId: id, brandName } })
        const add = await Add.findOne({ where: { userId: id, brandName } })
        const info = await Info.findOne({ where: { userId: id, brandName } })
        const goods = await Goods.findOne({ where: { userId: id, brandName } })
        const reportThreeMonths = await ReportThreeMonths.findOne({ where: { userId: id, brandName } })
        const reportMonthly = await ReportMonthly.findOne({ where: { userId: id, brandName } })
        const reportTwoWeeks = await ReportTwoWeeks.findOne({ where: { userId: id, brandName } })
        const reportWeekly = await ReportWeekly.findOne({ where: { userId: id, brandName } })
        const reportDaily = await ReportDaily.findOne({ where: { userId: id, brandName } })
        const initialCostsAndTax = await InitialCostsAndTax.findOne({ where: { userId: id, brandName } })

        const [
            penalty,
            additionalPayment,
            wbComission,
            logistics,
            marginRevenue,
            lostProfit,
            profit,
            marginCosts,
            netProfit,
            averageProfit,
            roi,
            vpProfitMargin,
            opProfitMargin,
            advertisment,
            commissionFromProfit,
            logisticsFromProfit
        ] = await Promise.all([
            calculatePenalty(reportDetailByPeriod.data, days),
            calculateAdditionalPayment(reportDetailByPeriod.data, days),
            calculateCommission(sales.data, days),
            calculateDeliveryCost(reportDetailByPeriod.data, days),
            calculateMarginalProfit(reportDetailByPeriod.data, days),
            calculateReturn(orders.data, days),
            calculateOrders(sales.data, days),
            calculateMargin(reportDetailByPeriod.data, days),
            calculateNetProfit(reportDetailByPeriod.data, days),
            calculateAverageProfit(sales.data, days),
            calculateROI(reportDetailByPeriod.data, days),
            calculateGrossProfit(sales.data, reportDetailByPeriod.data, days),
            calculateGrossProfit(sales.data, reportDetailByPeriod.data, days),
            calculateAdvertisementMetrics(add.data, calculateOrders(sales.data, days).sum, days),
            calculateCommissionFromProfit(reportDetailByPeriod.data, days),
            calculateCommissionFromDelivery(reportDetailByPeriod.data, days)
        ]);

        const content = {
            chartData: null,
            initialPrice: 0,
            penalty,
            additionalPayment,
            wbComission,
            logistics,
            marginRevenue,
            lostProfit,
            profit,
            marginCosts,
            grossProfit: { sum: profit.sum, percent: 0 },
            tax: { sum: 0, percent: 0 },
            netProfit,
            averageProfit,
            roi,
            vpProfitMargin,
            opProfitMargin,
            yearProfitMargin: null,
            fbo: await findFBSFBO(orders.data, warehouses.data, days),
            fbs: await findFBSFBO(orders.data, warehouses.data, days),
            toClient: stocks.data.filter(i => i.inWayToClient && new Date(i.lastChangeDate) >= startDate),
            fromClient: stocks.data.filter(i => i.inWayFromClient && new Date(i.lastChangeDate) >= startDate),
            notSorted: await calculateNotSorted(stocks.data, days),
            advertisment,
            commissionFromProfit,
            logisticsFromProfit
        };

        return res.json({
            warehouses,
            warehousesWB,
            supplies,
            newOrders,
            reshipmentOrders,
            incomes,
            stocks,
            orders,
            sales,
            reportDetailByPeriod,
            add,
            info,
            goods,
            content,
            reportDaily,
            reportWeekly,
            reportTwoWeeks,
            reportMonthly,
            reportThreeMonths,
            initialCostsAndTax
        })
    }

    async getGeographyData(req, res) {
        const { id } = req.params
        const { days, brandName } = req.query

        const ordersRes = await Order.findOne({ where: { userId: id, brandName } })
        const salesRes = await Sale.findOne({ where: { userId: id, brandName } })

        const lastDate = new Date().setDate(new Date().getDate() - days);

        function filterByDate(obj, field) {
            return obj.filter(item => {
                const itemDate = new Date(item[field]);
                return itemDate >= lastDate && itemDate <= new Date();
            });
        }

        const state = {
            orders: ordersRes.dataValues,
            sales: salesRes.dataValues,
        }

        const data = {
            orders: filterByDate(state.orders.data, 'date'),
            sales: filterByDate(state.sales.data, 'date'),
        }

        const orders = data.orders
        const sales = data.sales

        const fos = orders ? orders.map(item => item.oblastOkrugName) : []
        const uniqueFos = fos ? [...new Set(fos)] : []
        const uniqueFosSales = fos ? [...new Set(sales.map(item => item.oblastOkrugName))] : []

        const totalOrdersSum = orders ? orders.reduce((acc, item) => acc + item.finishedPrice, 0).toFixed(2) : 0
        const totalSalesSum = sales ? sales.reduce((acc, item) => acc + item.finishedPrice, 0).toFixed(2) : 0

        const totalOrdersAmount = orders ? orders.length : 0
        const totalSalesAmount = sales ? sales.length : 0

        const totalOrdersAmountState = state.orders.data ? state.orders.data.length : 0
        const totalSalesAmountState = state.sales.data ? state.sales.data.length : 0

        const ordersByFosTotal = uniqueFos && state && state.orders ? uniqueFos.map(fo => state.orders.data.filter(item => item.oblastOkrugName === fo)).sort().reverse() : []
        const salesByFosTotal = uniqueFosSales && state && state.sales ? uniqueFosSales.map(fo => state.sales.data.filter(item => item.oblastOkrugName === fo)).sort().reverse() : []

        const ordersByFos = uniqueFos && orders ? uniqueFos.map(fo => orders.filter(item => item.oblastOkrugName === fo)).sort().reverse() : []
        const salesByFos = uniqueFosSales && sales ? uniqueFosSales.map(fo => sales.filter(item => item.oblastOkrugName === fo)).sort().reverse() : []

        const ordersTableData = ordersByFos ? ordersByFos.filter(item => item.length).map((array, i) => array.reduce((acc, item) => {
            acc['fo'] = item.oblastOkrugName ? item.oblastOkrugName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ').split('-').map(word => word.charAt(0).toUpperCase()
                + word.slice(1)).join('-') : "Регион не определен"
            acc['sum'] = array.reduce((a, i) => a + i.finishedPrice, 0).toFixed(0)
            acc['amount'] = array.length
            acc['percent'] = ((acc['amount'] / totalOrdersAmount) * 100).toFixed(2)
            acc['growth'] = ordersByFosTotal && ordersByFosTotal[i] ? calculateGrowthPercentageGeo(ordersByFosTotal[i], days) : 0
            return acc;
        }, {})) : null

        const salesTableData = salesByFos ? salesByFos.filter(item => item.length).map((array, i) => array.reduce((acc, item) => {
            acc['fo'] = item.oblastOkrugName ? item.oblastOkrugName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ').split('-').map(word => word.charAt(0).toUpperCase()
                + word.slice(1)).join('-') : "Регион не определен"
            acc['sum'] = array.reduce((a, i) => a + i.finishedPrice, 0).toFixed(0)
            acc['amount'] = array.length
            acc['percent'] = ((acc['amount'] / totalSalesAmount) * 100).toFixed(2)
            acc['growth'] = salesByFosTotal && salesByFosTotal[i] ? calculateGrowthPercentageGeo(salesByFosTotal[i], days) : 0
            return acc;
        }, {})) : null

        const ordersData = {
            labels: ordersTableData.map(item => item.fo.split(' ')).slice(0, 5),
            datasets: [
                {
                    data: ordersTableData.map(item => item.sum).slice(0, 5),
                    backgroundColor: [
                        'rgba(129, 172, 255, 1)',
                        'rgba(255, 153, 114, 1)',
                        'rgba(154, 129, 255, 1)',
                        'rgba(74, 217, 145, 1)',
                        'rgba(254, 197, 61, 1)',
                    ],
                    borderRadius: 10,
                    extraData: {
                        data: ordersTableData.slice(0, 5)
                    }
                },
            ],
        }

        const salesData = {
            labels: [...new Set(sales.map(item => {
                item.oblastOkrugName === '' ? item.oblastOkrugName = 'Регион не определен' : item.oblastOkrugName = item.oblastOkrugName
                return item.oblastOkrugName.split(' ')
            }))].slice(0, 5),
            datasets: [
                {
                    data: salesTableData.map(item => item.sum).slice(0, 5),
                    backgroundColor: [
                        'rgba(129, 172, 255, 1)',
                        'rgba(255, 153, 114, 1)',
                        'rgba(154, 129, 255, 1)',
                        'rgba(74, 217, 145, 1)',
                        'rgba(254, 197, 61, 1)',
                    ],
                    borderRadius: 10,
                    extraData: {
                        data: salesTableData.slice(0, 5)
                    }
                },
            ],
        }

        const warehouseNames = orders ? [...new Set(orders.map(item => item.warehouseName))] : []

        const ordersByWarehouseTotal = warehouseNames && state && state.orders ? warehouseNames.map(fo => state.orders.data.filter(item => item.warehouseName === fo)).sort().reverse() : []
        const salesByWarehouseTotal = warehouseNames && state && state.sales ? warehouseNames.map(fo => state.sales.data.filter(item => item.warehouseName === fo)).sort().reverse() : []


        let ordersByWarehouse = warehouseNames && data.orders ? warehouseNames.map(fo => ({ warehouse: fo, data: data.orders.filter(item => item.warehouseName === fo) })).sort((a, b) => b.data.length - a.data.length) : []
        let salesByWarehouse = warehouseNames && data.sales ? warehouseNames.map(fo => ({ warehouse: fo, data: data.sales.filter(item => item.warehouseName === fo) })).sort((a, b) => b.data.length - a.data.length) : []

        const ordersDataWarehouse = {
            labels: ordersByWarehouse.map(item => item.warehouse.split(' ')).slice(0, 5),
            datasets: [
                {
                    data: ordersByWarehouse.map(item => item.data.reduce((acc, item) => acc + item.finishedPrice, 0)).slice(0, 5),
                    backgroundColor: [
                        'rgba(129, 172, 255, 1)',
                        'rgba(255, 153, 114, 1)',
                        'rgba(154, 129, 255, 1)',
                        'rgba(74, 217, 145, 1)',
                        'rgba(254, 197, 61, 1)',
                    ],
                    borderRadius: 10,
                    extraData: {
                        data: ordersByWarehouse.slice(0, 5)
                    }
                },
            ],
        }

        const salesDataWarehouse = {
            labels: salesByWarehouse.map(item => item.warehouse.split(' ')).slice(0, 5),
            datasets: [
                {
                    data: salesByWarehouse.map(item => item.data.reduce((acc, item) => acc + item.finishedPrice, 0)).slice(0, 5),
                    backgroundColor: [
                        'rgba(129, 172, 255, 1)',
                        'rgba(255, 153, 114, 1)',
                        'rgba(154, 129, 255, 1)',
                        'rgba(74, 217, 145, 1)',
                        'rgba(254, 197, 61, 1)',
                    ],
                    borderRadius: 10,
                    extraData: {
                        data: salesByWarehouse.slice(0, 5)
                    }
                },
            ],
        }

        const ordersWarehouseTable = ordersByWarehouse ? ordersByWarehouse.map((item, i) => item.data.reduce((acc, obj) => {
            acc['fo'] = item.warehouse
            acc['sum'] = item.data.reduce((a, i) => a + i.finishedPrice, 0).toFixed(0)
            acc['amount'] = item.data.length
            acc['percent'] = ((acc['amount'] / totalSalesAmount) * 100).toFixed(2)
            acc['growth'] = ordersByWarehouseTotal && ordersByWarehouseTotal[i] ? calculateGrowthPercentageGeo(ordersByWarehouseTotal[i], days) : 0
            return acc
        }, {})) : null

        const salesWarehouseTable = salesByWarehouse ? salesByWarehouse.map((item, i) => item.data.reduce((acc, obj) => {
            acc['fo'] = item.warehouse
            acc['sum'] = item.data.reduce((a, i) => a + i.finishedPrice, 0).toFixed(0)
            acc['amount'] = item.data.length
            acc['percent'] = ((acc['amount'] / totalSalesAmount) * 100).toFixed(2)
            acc['growth'] = salesByWarehouseTotal && salesByWarehouseTotal[i] ? calculateGrowthPercentageGeo(salesByWarehouseTotal[i], days) : 0
            return acc
        }, {})) : null

        const object = {
            orders,
            sales,
            ordersData,
            salesData,
            ordersDataWarehouse,
            salesDataWarehouse,
            ordersTableData,
            salesTableData,
            ordersWarehouseTable,
            salesWarehouseTable,
            ordersByWarehouse,
            salesByWarehouse
        }

        const filtered = filterArraysNoData(object, days)

        return res.json(filtered)
    }

    async getCostsFile(req, res) {
        const { id } = req.params
        const { brandName } = req.query

        try {
            // Создаем новый Excel файл
            const workbook = new exceljs.Workbook();

            const options = { useStyles: true };
            const worksheet = workbook.addWorksheet('Sheet 1', options);

            const goods = await Goods.findOne({ where: { userId: id, brandName } })

            // Добавляем данные в Excel файл
            worksheet.columns = [
                { header: 'Артикул WB', key: 'wb_article', width: 30 },
                { header: 'Артикул продавца', key: 'product_article', width: 30 },
                { header: 'Себестоимость', key: 'initial_cost', width: 20 }
            ]

            for (let i in goods.dataValues.data.data.listGoods) {
                worksheet.addRow({
                    wb_article: goods.dataValues.data.data.listGoods[i].nmID,
                    product_article: goods.dataValues.data.data.listGoods[i].vendorCode,
                    initial_cost: '',
                })
            }

            const projectDir = path.resolve(__dirname);

            // Создаем директорию temp внутри директории проекта, если она не существует
            const tempDir = path.join(projectDir, 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir);
            }

            const filePath = path.join(tempDir, `Себестоимость.xlsx`) // Путь к файлу
            await workbook.xlsx.writeFile(filePath);



            res.download(filePath, `Себестоимость.xlsx`, (err) => {
                if (err) {
                    console.error('Ошибка при отправке файла:', err);
                    res.status(500).send('Произошла ошибка при отправке файла');
                } else {
                    // Удаляем временный файл
                    fs.unlinkSync(filePath);
                }
            });


        } catch (error) {
            console.error('Ошибка при генерации Excel файла:', error);
            res.status(500).send('Произошла ошибка при генерации Excel файла');
        }
    }

    async updateInitialCosts(req, res) {
        const { id } = req.params
        const { brandName } = req.query

        try {
            const file = req.file; // Получаем файл из запроса

            console.log(file);

            if (!file) {
                return res.status(400).json({ error: 'Файл не был загружен' });
            }

            // Проходим по каждой строке (кроме заголовка)
            const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(sheet);

            const modified = data.map(item => ({
                nmID: item['Артикул WB'],
                vendorCode: item['Артикул продавца'],
                initialCosts: item['Себестоимость']
            }))

            const existingRecord = await InitialCostsAndTax.findOne({
                where: { userId: id, brandName: brandName }
            });

            if (existingRecord) {
                // Если запись найдена, обновляем ее
                await existingRecord.update({ data: modified, });
                console.log('----------UPDATED----------');
            } else {
                // Если запись не найдена, создаем новую
                await InitialCostsAndTax.create({
                    userId: id,
                    brandName: brandName,
                    data: modified,
                });
                console.log('---------CREATED---------');
            }
            console.log('Данные из файла XLS:', modified);
            return res.status(200).json({ data: data });

            // console.log(jsonData);

        } catch (error) {
            console.error('Ошибка при обработке файла:', error);
            res.status(500).json({ error: 'Произошла ошибка при обработке файла' });
        }
    }

    async updateTax(req, res) {
        const { id } = req.params
        const { brandName } = req.query
        const { tax } = req.body

        console.log(req.body);

        const existingRecord = await InitialCostsAndTax.findOne({
            where: { userId: id, brandName: brandName }
        });

        if (existingRecord) {
            // Если запись найдена, обновляем ее
            await existingRecord.update({ tax: req.body });
            console.log('----------UPDATED----------');
        } else {
            // Если запись не найдена, создаем новую
            await InitialCostsAndTax.create({
                userId: id,
                brandName: brandName,
                tax: req.body,
            });
            console.log('---------CREATED---------');
        }

        return res.json({ tax })

    }

}


module.exports = new DataCollectionController()


function calculateGrowthPercentageGeo(data, days) {
    // Получаем текущую дату
    const currentDate = new Date();

    // Вычисляем дату days дней назад
    const pastDate = new Date(currentDate.getTime() - days * 24 * 60 * 60 * 1000);

    // Вычисляем сумму товаров за текущий период и предыдущий период
    let currentPeriodSum = 0;
    let pastPeriodSum = 0;

    data.forEach(item => {
        // Преобразуем дату из строки в объект Date
        const itemDate = new Date(item.date);

        // Если дата товара попадает в текущий период
        if (itemDate >= pastDate && itemDate <= currentDate) {
            currentPeriodSum += item.finishedPrice;
        }

        // Если дата товара попадает в прошлый период
        if (itemDate < pastDate) {
            pastPeriodSum += item.finishedPrice;
        }
    });

    // Вычисляем процентный рост
    const growthPercentage = ((currentPeriodSum - pastPeriodSum) / pastPeriodSum) * 100;

    return growthPercentage;
}

function filterArraysNoData(obj, days) {
    for (let key in obj) {
        if (obj[key] && Array.isArray(obj[key]) && (key !== 'warehouses' && key !== 'info')) {
            if (typeof obj[key] === 'object' && obj[key].length) {
                obj[key] = obj[key].filter(item => {
                    if (item.date) {
                        const date = item.date ? new Date(item.date) : item.lastChangeDate ? new Date(item.lastChangeDate) : item.sale_dt ? new Date(item.sale_dt) : new Date(item.create_dt);
                        const weekAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
                        return date >= weekAgo;
                    } else {
                        return true
                    }
                });
            }
        }
    }
    return obj
}