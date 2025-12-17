import "DAO"

// SCRIPT TO GET THE LATEST TOPICS

access(all) fun main(): [DAO.TopicInfo] {
    let topicInfos = DAO.getLatestTopics()
    return topicInfos
}
