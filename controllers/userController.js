const { User } = require('../models/models')
const ApiError = require('../error/ApiError')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer');
const uuid = require('uuid');
const axios = require('axios');


async function fetchData(url, resToken) {
    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${resToken}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Ошибка при запросе к API:', error.message);
        return null;
    }
}




const confirmationCodes = {};

const generateJWT = (id, email, phone, stage, role, firstName, lastName, patronym, confirmed, isOnboarded, promoCode, isActive, image, updatedAt) => {
    return jwt.sign({ id, email, phone, stage, role, firstName, lastName, patronym, confirmed, isOnboarded, promoCode, isActive, image, updatedAt }, process.env.SECRET_KEY, { expiresIn: '24h' })
}

class UserController {

    async register(req, res, next) {
        const { email, password, phone, stage, role, firstName, lastName, patronym, confirmed, isOnboarded, promoCode, isActive, image, updatedAt } = req.body
        if (!email || !password) {
            return next(ApiError.badRequest('Incorrect email or password'))
        }
        const candidate = await User.findOne({ where: { email } })
        if (candidate) {
            return next(ApiError.badRequest('User with this email already exists'))
        }
        const hashPass = await bcrypt.hash(password, 5)
        const user = await User.create({ email, phone, stage, role, firstName, lastName, patronym, confirmed, isOnboarded, promoCode, isActive, image, updatedAt, password: hashPass })

        const token = generateJWT(user.id, user.email, user.role, user.firstName, user.lastName, user.isActive, user.image, user.patronym, user.stage, user.confirmed, user.isOnboarded, user.promoCode)

        const confirmationCode = uuid.v4();
        confirmationCodes[email] = confirmationCode;

        user.update({ confirmationCode: confirmationCode }, { where: { email: email } })

        let transporter = nodemailer.createTransport({
            host: 'mail.hosting.reg.ru',
            port: 465,
            secure: true,
            auth: {
                user: 'radar-analytica@radar-analytica.ru',
                pass: 'glebarioO1!',
            },
        });


        let result = await transporter.sendMail({
            from: 'radar.analytica@mail.ru',
            to: email,
            subject: 'Подтверждение регистрации',
            text: 'Данное письмо отправлено с сервиса Radat Analytica',
            html:
                `<div style="padding: 1rem; background-color: white; ">
                        <div style="padding: 1rem;">
                            <svg width="200" height="74" viewBox="0 0 200 74" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom: 30px">
                                <path d="M160.646 41.5532V15.744H169.233V21.8258C170.118 19.6111 171.328 17.9501 172.861 16.8428C174.394 15.7355 176.251 15.1818 178.432 15.1818C178.79 15.1818 179.147 15.1989 179.505 15.2329C179.88 15.25 180.255 15.284 180.629 15.3351L179.761 23.6145C179.215 23.4271 178.679 23.2909 178.151 23.2057C177.623 23.1205 177.112 23.0779 176.618 23.0779C174.403 23.0779 172.691 23.7593 171.481 25.1222C170.289 26.468 169.692 28.3846 169.692 30.8718V41.5532H160.646Z" fill="#1A1A1A"/>
                                <path d="M147.293 28.6233C147.293 26.6131 146.756 25.0202 145.683 23.8448C144.609 22.6693 143.144 22.0815 141.287 22.0815C139.431 22.0815 137.965 22.6693 136.892 23.8448C135.836 25.0032 135.308 26.596 135.308 28.6233C135.308 30.6335 135.845 32.2178 136.918 33.3763C137.991 34.5347 139.448 35.1139 141.287 35.1139C143.144 35.1139 144.609 34.5347 145.683 33.3763C146.756 32.2178 147.293 30.6335 147.293 28.6233ZM155.291 15.7442V41.5535H146.935V37.3626C145.742 39.1514 144.396 40.4632 142.897 41.2979C141.415 42.1327 139.669 42.5501 137.659 42.5501C134.218 42.5501 131.466 41.2979 129.405 38.7937C127.344 36.2724 126.313 32.8993 126.313 28.6744C126.313 24.4666 127.386 21.1275 129.533 18.6574C131.696 16.1701 134.601 14.9265 138.247 14.9265C140.189 14.9265 141.858 15.3439 143.255 16.1786C144.669 16.9964 145.879 18.2655 146.884 19.9861V15.7442H155.291Z" fill="#1A1A1A"/>
                                <path d="M114.365 28.6742C114.365 26.6639 113.829 25.0796 112.756 23.9212C111.699 22.7627 110.251 22.1835 108.411 22.1835C106.572 22.1835 105.124 22.7627 104.067 23.9212C103.011 25.0796 102.483 26.6639 102.483 28.6742C102.483 30.7014 103.003 32.2943 104.042 33.4527C105.098 34.5941 106.555 35.1648 108.411 35.1648C110.251 35.1648 111.699 34.5856 112.756 33.4272C113.829 32.2687 114.365 30.6844 114.365 28.6742ZM122.44 1.94501V41.5532H114.059V37.3624C112.9 39.1001 111.597 40.4033 110.149 41.2721C108.701 42.1239 107.091 42.5498 105.319 42.5498C101.691 42.5498 98.8033 41.2977 96.6568 38.7934C94.5103 36.2892 93.437 32.9161 93.437 28.6742C93.437 24.5685 94.5017 21.2551 96.6312 18.7338C98.7777 16.1954 101.572 14.9263 105.013 14.9263C107.193 14.9263 108.965 15.3181 110.328 16.1018C111.708 16.8854 112.934 18.1972 114.008 20.037C113.906 19.4237 113.829 18.7338 113.778 17.9672C113.727 17.1835 113.701 16.3403 113.701 15.4374V1.94501H122.44Z" fill="#1A1A1A"/>
                                <path d="M81.336 28.6233C81.336 26.6131 80.7994 25.0202 79.7261 23.8448C78.6529 22.6693 77.1878 22.0815 75.3309 22.0815C73.474 22.0815 72.0089 22.6693 70.9357 23.8448C69.8795 25.0032 69.3513 26.596 69.3513 28.6233C69.3513 30.6335 69.888 32.2178 70.9612 33.3763C72.0345 34.5347 73.491 35.1139 75.3309 35.1139C77.1878 35.1139 78.6529 34.5347 79.7261 33.3763C80.7994 32.2178 81.336 30.6335 81.336 28.6233ZM89.3343 15.7442V41.5535H80.9783V37.3626C79.7858 39.1514 78.4399 40.4632 76.9408 41.2979C75.4587 42.1327 73.7125 42.5501 71.7023 42.5501C68.2611 42.5501 65.5098 41.2979 63.4484 38.7937C61.3871 36.2724 60.3564 32.8993 60.3564 28.6744C60.3564 24.4666 61.4297 21.1275 63.5762 18.6574C65.7398 16.1701 68.6444 14.9265 72.29 14.9265C74.2321 14.9265 75.9016 15.3439 77.2985 16.1786C78.7125 16.9964 79.9221 18.2655 80.9272 19.9861V15.7442H89.3343Z" fill="#1A1A1A"/>
                                <path d="M30.291 41.5532V4.14264H40.9469C45.1207 4.14264 48.0253 4.33855 49.6607 4.73037C51.3132 5.10516 52.7357 5.744 53.9282 6.6469C55.274 7.66905 56.3047 8.97229 57.0202 10.5566C57.7527 12.1409 58.119 13.8871 58.119 15.7951C58.119 18.6912 57.4035 21.0507 55.9725 22.8735C54.5585 24.6793 52.4887 25.8803 49.7629 26.4766L59.9588 41.5532H48.4341L39.8481 26.911V41.5532H30.291ZM39.8481 21.8258H41.7391C43.9367 21.8258 45.538 21.451 46.5432 20.7014C47.5653 19.9519 48.0764 18.7764 48.0764 17.175C48.0764 15.3011 47.5994 13.9723 46.6454 13.1886C45.7084 12.388 44.1241 11.9876 41.8924 11.9876H39.8481V21.8258Z" fill="#1A1A1A"/>
                                <path d="M65.8801 53.931C65.5855 49.718 68.762 46.0639 72.9749 45.7693L190.451 37.5546C194.664 37.26 198.318 40.4364 198.613 44.6494L199.467 56.8549C199.761 61.0679 196.585 64.722 192.372 65.0166L74.8952 73.2313C70.6823 73.5259 67.0282 70.3495 66.7336 66.1365L65.8801 53.931Z" fill="#F0AD00"/>
                                <path d="M19.0324 46.9878C17.4155 47.5023 15.6817 46.6099 15.2298 44.9745C11.357 30.9572 11.3904 16.1455 15.3264 2.14583C15.7856 0.512421 17.5235 -0.37208 19.138 0.149692C20.7526 0.671463 21.6318 2.40192 21.1778 4.0368C17.6296 16.8148 17.5992 30.3161 21.0897 43.1099C21.5363 44.7468 20.6493 46.4733 19.0324 46.9878Z" fill="#F0AD00"/>
                                <path d="M5.11613 41.3215C3.46463 41.7106 1.80424 40.6881 1.47901 39.0228C-0.402813 29.3874 -0.489642 19.4869 1.2229 9.82001C1.51887 8.1493 3.16107 7.09781 4.81915 7.4579C6.47722 7.81798 7.52277 9.4532 7.23217 11.1249C5.70748 19.8954 5.78619 28.8703 7.46447 37.6128C7.78435 39.2791 6.76764 40.9324 5.11613 41.3215Z" fill="#F0AD00"/>
                                <path d="M179.885 53.7623L183.759 53.4914L181.975 48.8802C181.92 48.7402 181.842 48.5136 181.741 48.2003C181.641 47.8871 181.512 47.4843 181.353 46.992C181.293 47.3492 181.232 47.6901 181.17 48.0148C181.114 48.339 181.054 48.6504 180.99 48.9491L179.885 53.7623ZM174.804 59.4812L178.732 44.8514L183.611 44.5103L189.547 58.4502L185.674 58.7211L184.773 56.2151L179.24 56.6019L178.677 59.2103L174.804 59.4812Z" fill="white"/>
                                <path d="M173.326 45.7883L173.624 50.0427C173.049 49.488 172.485 49.0927 171.933 48.8568C171.386 48.6139 170.811 48.5136 170.206 48.5559C169.087 48.6342 168.206 49.0814 167.564 49.8977C166.927 50.707 166.652 51.7264 166.738 52.9559C166.818 54.1008 167.236 55.0259 167.991 55.7314C168.753 56.4364 169.68 56.7507 170.773 56.6743C171.378 56.632 171.935 56.4558 172.442 56.1458C172.956 55.8287 173.459 55.3523 173.951 54.7166L174.249 58.9807C173.652 59.3231 173.053 59.5905 172.452 59.7829C171.851 59.9753 171.238 60.0933 170.613 60.137C169.833 60.1916 169.104 60.1477 168.427 60.0055C167.758 59.8693 167.133 59.6319 166.554 59.2932C165.437 58.6523 164.561 57.8082 163.925 56.7609C163.29 55.7137 162.925 54.5103 162.83 53.1507C162.753 52.0579 162.86 51.0536 163.148 50.1378C163.443 49.2151 163.923 48.3644 164.588 47.5858C165.216 46.8425 165.94 46.2688 166.762 45.8649C167.59 45.4606 168.525 45.222 169.565 45.1492C170.19 45.1055 170.813 45.1371 171.435 45.244C172.057 45.3509 172.687 45.5323 173.326 45.7883Z" fill="white"/>
                                <path d="M156.85 60.7367L155.851 46.4515L159.783 46.1765L160.782 60.4617L156.85 60.7367Z" fill="white"/>
                                <path d="M147.746 61.3732L146.983 50.4642L143.782 50.688L143.546 47.3118L153.841 46.592L154.077 49.9681L150.876 50.1919L151.639 61.101L147.746 61.3732Z" fill="white"/>
                                <path d="M136.28 62.175L135.825 55.6569L130.286 48.2391L134.755 47.9266L136.934 51.4708C136.949 51.4895 136.971 51.5239 137 51.5741C137.229 51.9438 137.394 52.3015 137.497 52.6474C137.54 52.3241 137.655 51.9598 137.842 51.5544C137.876 51.4802 137.899 51.4295 137.91 51.4026L139.555 47.5909L144.034 47.2777L139.581 55.3942L140.037 61.9123L136.28 62.175Z" fill="white"/>
                                <path d="M124.201 63.0198L123.202 48.7346L127.095 48.4623L127.861 59.4104L132.7 59.072L132.934 62.4091L124.201 63.0198Z" fill="white"/>
                                <path d="M113.162 58.4281L117.036 58.1572L115.253 53.5459C115.197 53.406 115.119 53.1794 115.019 52.8661C114.918 52.5528 114.789 52.1501 114.63 51.6578C114.57 52.015 114.509 52.3559 114.447 52.6806C114.391 53.0048 114.331 53.3162 114.267 53.6149L113.162 58.4281ZM108.081 64.147L112.01 49.5172L116.888 49.176L122.825 63.116L118.951 63.3868L118.05 60.8808L112.518 61.2677L111.955 63.8761L108.081 64.147Z" fill="white"/>
                                <path d="M92.7226 65.2209L91.7236 50.9357L95.4803 50.673L101.39 57.6432C101.505 57.7855 101.695 58.0762 101.961 58.5151C102.233 58.9472 102.534 59.4654 102.864 60.0699C102.744 59.4834 102.649 58.9606 102.578 58.5014C102.513 58.0418 102.468 57.6332 102.443 57.2754L101.95 50.2206L105.687 49.9593L106.686 64.2445L102.949 64.5058L97.0368 57.5063C96.9157 57.3645 96.7191 57.0775 96.4471 56.6455C96.181 56.2065 95.8868 55.691 95.5643 55.0991C95.6842 55.6921 95.7766 56.2184 95.8414 56.678C95.9127 57.1372 95.9609 57.5456 95.9859 57.9034L96.4792 64.9582L92.7226 65.2209Z" fill="white"/>
                                <path d="M81.6842 60.6293L85.558 60.3584L83.7746 55.7471C83.719 55.6072 83.6411 55.3806 83.5407 55.0673C83.4404 54.754 83.3109 54.3512 83.1523 53.859C83.0923 54.2162 83.0311 54.5571 82.9688 54.8818C82.9131 55.206 82.8531 55.5174 82.789 55.816L81.6842 60.6293ZM76.6029 66.3481L80.5316 51.7184L85.4104 51.3772L91.3467 65.3171L87.4729 65.588L86.5721 63.082L81.0395 63.4689L80.4767 66.0772L76.6029 66.3481Z" fill="white"/>  
                            </svg>
                            <h1>Здраствуйте, ${lastName}!</h1>
                            <p style="color: #8C8C8C;">Осталось совсем чуть-чуть</p>
                            <br>
                            <p>Подтвердите регистрацию по ссылке:</p>
                            <a style="color: #5329FF; font-weight: bold;" href="https://radar-analytica.ru/development/confirmation/${email}/${confirmationCode}">Подтвердить</a>
                            <br>
                            <p>C наилучшими пожеланиями,</p>
                            <p>Команда сервиса Radar Analytica</p>
                        </div>
                        <div style="background-color: lightgrey; padding: 1rem; border-radius: 4px;">
                            <p>Вы получили это письмо, так как зарегистрировались на сайте</p>
                            <a href="https://radar-analytica.ru">https://radar-analytica.ru</a>
                            <br>
                            <p>Если вы не проводили регистрацию, <span style="color: red; font-weight: 700;">не переходите по ссылке</span>. Вы так же можете обратиться в службу поддержки</p>
                        </div>
                    </div>`,
        });


        return res.json(null)
    }

    async confirm(req, res, next) {
        const { email, code } = req.body
        const user = await User.findOne({ where: { email } })
        if (user && user.email === email && user.confirmationCode === code) {
            user.update({ confirmed: true }, { where: { email } })
        }
        return res.json({ confirmed: true })
    }

    async login(req, res, next) {
        const { email, password } = req.body
        const user = await User.findOne({ where: { email } })
        if (!user) {
            return next(ApiError.internal('User not found'))
        }
        let comparePassword = bcrypt.compareSync(password, user.password)
        if (!comparePassword && !user.confirmed) {
            return next(ApiError.internal('Wrong password or email is not confirmed'))
        }
        const token = generateJWT(user.id, user.email, user.phone, user.role, user.firstName, user.lastName, user.isActive, user.image, user.patronym, user.stage, user.confirmed, user.isOnboarded, user.promoCode)
        if (user.confirmed) {
            return res.json({ token })
        }
        return
    }

    async check(req, res) {
        const token = generateJWT(req.user.id, req.user.email, req.user.role, req.user.firstName, req.user.lastName,
            req.user.isActive, req.user.image, req.user.patronym, req.user.isOnboarded, req.user.stage, req.user.promoCode, req.user.confirmed, req.user.phone)
        return res.json({ token })
    }

    async getOne(req, res) {
        const { id } = req.params
        const user = await User.findOne({ where: { id } })
        user.password = ''
        return res.json(user)
    }

    async updateImage(req, res) {
        const { id } = req.params
        const { image } = req.body
        const user = await User.update({ image: image }, { where: { id } })
        return res.json(user)
    }

    async updateToken(req, res) {
        const { id } = req.params
        const { token, brandName } = req.body
        const user = await User.findOne({ where: { id } })
        try {
            const signedToken = jwt.sign({ token }, process.env.SECRET_KEY);
            await User.update({ token: signedToken, brandName }, { where: { id } });
            res.status(200).json({ success: true, message: 'Токен успешно обновлен и сохранен.' });
        } catch (error) {
            console.error('Ошибка при обновлении токена:', error);
            res.status(500).json({ success: false, message: 'Произошла ошибка при обновлении токена.' });
        }
    }

    async updateUser(req, res) {
        const { id, email, password, phone, stage, role, firstName, lastName, patronym, confirmed, isOnboarded, promoCode, isActive, } = req.body
        const user = await User.findOne({ where: { id } })
        if (email) {
            user.update({ email: email })
        }
        if (password) {
            const hashPass = await bcrypt.hash(password, 5)
            user.update({ password: hashPass })
        }
        if (firstName) {
            user.update({ firstName: firstName })
        }
        if (lastName) {
            user.update({ lastName: lastName })
        }
        if (role) {
            user.update({ role: role })
        }
        if (isActive) {
            user.update({ isActive: isActive })
        }
        if (patronym) {
            user.update({ lastName: lastName })
        }
        if (promoCode) {
            user.update({ role: role })
        }
        if (isOnboarded) {
            user.update({ isActive: isActive })
        }
        if (phone) {
            user.update({ role: role })
        }
        if (stage) {
            user.update({ isActive: isActive })
        }
        if (confirmed) {
            user.update({ isActive: isActive })
        }
        return res.json(user)
    }

    async getAll(req, res) {
        const users = await User.findAll()
        users.forEach(x => x.password = '')
        return res.json(users)
    }

    async getWBData(req, res) {
        const { id } = req.params
        const { dateFrom } = req.query

        try {
            const user = await User.findOne({ where: { id } });
            if (!user) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }

            const decodedToken = jwt.decode(user.token, { complete: true });
            const resToken = decodedToken && decodedToken.payload ? decodedToken.payload.token : null;

            const urls = [
                `https://suppliers-api.wildberries.ru/api/v3/warehouses?dateFrom=${dateFrom}`,
                `https://suppliers-api.wildberries.ru/api/v3/supplies?dateFrom=${dateFrom}`,
                `https://suppliers-api.wildberries.ru/api/v3/supplies?dateFrom=${dateFrom}`,
                `https://suppliers-api.wildberries.ru/api/v3/supplies/orders/reshipment?dateFrom=${dateFrom}`,
                `https://statistics-api.wildberries.ru/api/v1/supplier/incomes?dateFrom=${dateFrom}`,
                `https://statistics-api.wildberries.ru/api/v1/supplier/stocks?dateFrom=${dateFrom}`,
                `https://statistics-api.wildberries.ru/api/v1/supplier/orders?dateFrom=${dateFrom}`,
                `https://statistics-api.wildberries.ru/api/v1/supplier/sales?dateFrom=${dateFrom}`,
                `https://statistics-api.wildberries.ru/api/v1/supplier/reportDetailByPeriod?dateFrom=${dateFrom}`,
                `https://suppliers-api.wildberries.ru/public/api/v1/info`
            ];

            // const responses = await Promise.all(urls.map(url => fetchData(url, resToken)));

            const responseData = {};

            const names = [
                'warehouses',
                'supplies',
                'newOrders',
                'reshipmentOrders',
                'incomes',
                'stocks',
                'orders',
                'sales',
                'reportDetailByPeriod',
                'info'
            ]

            for (let i = 0; i < urls.length; i++) {
                try {
                    const response = await axios.get(urls[i], {
                        headers: {
                            Authorization: `Bearer ${resToken}`
                        },
                        timeout: 1000
                    });
                    responseData[names[i]] = response.data;
                } catch (error) {
                    console.error('Ошибка при запросе к API:', error.message);
                    responseData[names[i]] = null;
                }
            }

            return res.json(responseData);
        } catch (error) {
            console.error('Ошибка при получении данных:', error.message);
            return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
        }

    }

}


module.exports = new UserController()
