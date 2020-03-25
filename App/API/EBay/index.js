import https from 'https';

const Ebay = ({ callbackname, url }) => {
	return new Promise(
		(resolve, reject) => {
			let result = '';

			const req = https.request(new URL(url), response => {
				const { statusCode: http_code } = response;
				response.on('data', chunk => {
					result += chunk;
				});

				response.on('end', function () {
					resolve({ http_code, result: `${callbackname}(${result})` });
				});
			});

			req.on('error', (error) => {
				reject({ http_code: 500, error });
			});

			req.end();
		}
	);
}

export default Ebay;