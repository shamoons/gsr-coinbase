import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { Typography, Divider, Layout, Row, Col, Space, Button, AutoComplete, List } from 'antd';
import axios from 'axios'

const COINBASE_WS_URL = 'wss://ws-feed.pro.coinbase.com'

export default function Home() {
  const [socketUrl, setSocketUrl] = useState<string>(COINBASE_WS_URL);
  const [instrumentList, setInstrumentList] = useState([]);
  const [selectedInstrument, setSelectedInstrument] = useState<string | null>();
  const [bids, setBids] = useState<any[]>([]);
  const [asks, setAsks] = useState<any[]>([]);
  const messageHistory = useRef([]);

  const {
    sendMessage,
    lastMessage,
    readyState,
  } = useWebSocket(socketUrl, {
    shouldReconnect: (closeEvent) => true
  });

  useEffect(() => {
    const getInstrumentList = async () => {
      const response = await axios.get('https://api.pro.coinbase.com/products');
      setInstrumentList(response.data)
    }

    getInstrumentList();
  }, [])

  useEffect(() => {
    if (lastMessage?.data?.length > 0) {
      const msgData = JSON.parse(lastMessage?.data);

      if (msgData.type !== 'l2update') {
        return
      }

      let newBids = msgData?.changes.filter((change: any) => change[0] === 'buy').map((change: any) => [Number(change[1]), Number(change[2])]);
      let newAsks = msgData?.changes.filter((change: any) => change[0] === 'sell').map((change: any) => [Number(change[1]), Number(change[2])]);

      setBids((b: any[]) => {
        let tmp: any[] = newBids

        b.forEach(t => {
          // If we have an item in our current order book, then we should not update it
          if (newBids.findIndex((n: any) => n[0] === t[0]) === -1) {
            tmp.push(t)
          }
        })

        tmp = tmp.filter(t => t[1] > 0).sort((a, b) => a[0] - b[0]).slice(0, 10)

        return tmp
      })

      setAsks((b: any[]) => {
        let tmp: any[] = newAsks

        b.forEach(t => {
          // If we have an item in our current order book, then we should not update it
          if (newAsks.findIndex((n: any) => n[0] === t[0]) === -1) {
            tmp.push(t)
          }
        })

        tmp = tmp.filter(t => t[1] > 0).sort((a, b) => a[0] - b[0]).slice(0, 10)

        return tmp
      })

    }

  }, [lastMessage?.data])

  const handleClick = async () => {
    sendMessage(JSON.stringify({
      "type": "subscribe",
      "product_ids": [
        selectedInstrument
      ],
      "channels": [
        "level2",
        {
          "name": "ticker",
          "product_ids": [
            selectedInstrument
          ]
        }
      ]
    }))
  }

  const connectionStatus = {
    [ReadyState.CONNECTING]: 'Connecting',
    [ReadyState.OPEN]: 'Open',
    [ReadyState.CLOSING]: 'Closing',
    [ReadyState.CLOSED]: 'Closed',
    [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
  }[readyState];

  return (
    <Layout style={{ padding: 20 }}>
      <Typography>
        <Typography.Title>GSR Coinbase Websocket Pro</Typography.Title>
      </Typography>
      <Typography>
        <Typography.Title level={2}>Connection Status: {connectionStatus}</Typography.Title>
      </Typography>
      <Divider />
      <Space>
        <AutoComplete
          placeholder="Find a Coinbase Pro Instrument"
          style={{ width: 300 }}
          options={instrumentList.map((i: any) => ({ value: i.id, label: i.display_name }))}
          onSelect={v => setSelectedInstrument(v as string)}
          filterOption={(inputValue, option) =>
            (option!.label as string)?.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
          }
        />
        <Button type="primary" onClick={handleClick} disabled={readyState !== ReadyState.OPEN}>Connect</Button>

      </Space>
      <Divider />
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <List
            header={<Typography.Title level={3}>Bids</Typography.Title>}
            bordered
            dataSource={bids}
            renderItem={item => (
              <List.Item>
                <Typography.Text >{item[0]} - {item[1]}</Typography.Text>
              </List.Item>
            )}
          />
        </Col>
        <Col span={12}>
          <List
            header={<Typography.Title level={3}>Asks</Typography.Title>}
            bordered
            dataSource={asks}
            renderItem={item => (
              <List.Item>
                <Typography.Text >{item[0]} - {item[1]}</Typography.Text>
              </List.Item>
            )}
          />
        </Col>
      </Row>
      <div>

        {lastMessage ? <span>Last message: {lastMessage.data}</span> : null}

      </div>
    </Layout>
  );
}
