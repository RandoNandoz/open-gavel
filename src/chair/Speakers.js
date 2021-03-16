import React, { useEffect, useState } from 'react';
import { useCommitteeContext } from '../contexts/CommitteeContext';

const Speakers = (props) => {

    const { getSettings, getCountries, setCountries, setPushNext } = useCommitteeContext();

    const [ presentCountries, setPresentCountries ] = useState([]);
    const [ screen, setScreen ] = useState(getSettings() ? getSettings().default_speaker_screen : '');

    const [activeSpeaker, setActiveSpeaker] = useState({});
    const [time, setTime] = useState(0);
    const [speakersList, setSpeakersList] = useState((screen === 'Primary') ? (sessionStorage.getItem('speakersDataPrimary') ? JSON.parse(sessionStorage.getItem('speakersDataPrimary')).list : []) : (sessionStorage.getItem('speakersDataSecondary') ? JSON.parse(sessionStorage.getItem('speakersDataSecondary')).list : []));

    const [displayCountries, setDisplayCountries] = useState([]);
    const [displayList, setDisplayList] = useState([]);
    const [refresh, setRefresh] = useState(false);

    const [selectedSpeakers, setSelectedSpeakers] = useState([]);

    const [showRemove, setShowRemove] = useState(false);
    const [showStart, setShowStart] = useState(speakersList ? ((speakersList.length > 0) ? true : false) : false);
    const [started, setStarted] = useState(false);

    const [timerID, setTimerID] = useState([]); // use to set/clear interval function
    const [ticking, setTicking] = useState(false);

    const max = 60;

    // update present/present & voting countries
    useEffect(() => {
        let countries = getCountries();
        if(countries) {
            let available = [];
            available = countries.filter((item) => (item.presence ==='voting' || item.presence === 'present'));
            setPresentCountries(available);
        }
    }, []);

    useEffect(() => {
        if(screen === 'Primary') {
            sessionStorage.setItem('speakerScreen', 'Primary');
        } else if (screen === 'Secondary') {
            sessionStorage.setItem('speakerScreen', 'Secondary');
        } else if (screen === 'Single') {
            sessionStorage.setItem('speakerScreen', 'Single');
        } else {
            sessionStorage.removeItem('speakerScreen');
        }
    } , [screen])

    // update countries display
    useEffect(() => {
        let return_val = [];

        for(let i = 0; i < presentCountries.length; i++) {
            return_val.push(
                <div className='country-to-add' onClick={e=>handleAddToList(presentCountries[i]._id)}>
                    {presentCountries[i].name}
                </div>
            )
        }

        setDisplayCountries(return_val);
    }, [presentCountries, refresh]);

    // update countries list (after added from countries display above)
    useEffect(() => {
        let return_val = [];

        for (let i = 0; i < speakersList.length; i++) {
            return_val.push(
                <div className={`country-in-list ${speakersList[i]._id}`} onClick={e=>handleToggleSelect(speakersList[i]._id)}>
                    {speakersList[i].name}
                </div>
            )
        }

        setDisplayList(return_val);
    }, [speakersList, refresh]);

    function triggerRefresh() {
        setRefresh(refresh ? false : true);
    }

    function handleAddToList(country_id) {
        let newList = speakersList;
        if(!started) {
    
           // check if allowed action
            let found = false;
            for(let i = 0; i < speakersList.length; i++) {
                if (speakersList[i]._id == country_id) {
                    found = true;
                    break;
                }
            }
            if(!found) {
                let country = presentCountries.filter(item=>item._id===country_id)[0];
                newList.push(country);
            }
            
            setShowStart(true);
            setSpeakersList(newList);
            triggerRefresh();
        }
        saveState(newList);
    }

    function handleRemoveSelected() {
        let newList = speakersList;

        for(let i = 0; i < selectedSpeakers.length; i++) {
            newList.splice(newList.indexOf(presentCountries.filter(item=>item._id===selectedSpeakers[i])[0]), 1);
        }

        if(newList.length === 0) {
            setShowStart(false);
            setShowRemove(false);
        }
        setSelectedSpeakers([]);
        setSpeakersList(newList);
        triggerRefresh();
        saveState(newList);
    }

    function handleRemoveAll() {
        setSpeakersList([]);
        setSelectedSpeakers([]);
        saveState([]);
        setShowStart(false);
        setShowRemove(false);
        triggerRefresh();
    }

    function handleToggleSelect(country_id) {
        if(!started) {
            let newSelected = selectedSpeakers;
            
            if(!selectedSpeakers.includes(country_id)) {
                newSelected.push(country_id);
    
                let selected = document.getElementsByClassName(country_id);
                selected[0].classList.add('selected');
            } else {
                newSelected.splice(selectedSpeakers.indexOf(country_id), 1);
    
                let selected = document.getElementsByClassName(country_id);
                selected[0].classList.remove('selected');
            }
    
            if(newSelected.length > 0) {
                setShowRemove(true);
            } else {
                setShowRemove(false);
            }
            
            setSelectedSpeakers(newSelected);
            triggerRefresh();
        }
    }
    
    // timer cleaner
    useEffect(() => {
        if(!ticking) {
            for (let i = 0; i < timerID.length; i++ ) {
                clearInterval(timerID[i]);
            }
            setTimerID([]);
        }
    }, [ticking]);

    let timeElapsed = time ? time : 0;

    // ticker function -- invoked every second
    function tick() {
        timeElapsed += 1;
        setTime(timeElapsed);
        if(timeElapsed === max) {
            speakingPause();
        }
    }

    function saveState(newList) {
        let data = {
            time: timeElapsed.toString(),
            active: activeSpeaker,
            list: speakersList,
        };
        props.setDataStringy(JSON.stringify(data));
        if(newList) {
            if(screen === 'Primary') {
                sessionStorage.setItem('speakersDataPrimary', JSON.stringify({list: newList}));
            } else if (screen === 'Secondary') {
                sessionStorage.setItem('speakersDataSecondary', JSON.stringify({list: newList}));
            }
        }
    }

    useEffect(() => {
        saveState();
    }, [speakersList, activeSpeaker, timeElapsed]);

    function startTick() {
        const timer = setInterval(tick, 1000);
        let timerIDs = timerID;
        timerIDs.push(timer);
        setTimerID(timerIDs);
    }

    function speakingStart() {
        // add activeSpeaker const, start timer
        setActiveSpeaker(speakersList[0]);
        
        if(timerID.length === 0) {
            startTick();
        }
    }

    function updateCountriesSession() {
        
        if(activeSpeaker) {
            setPushNext('true');
    
            // save data (speaking statistic)
            let countries = getCountries();
            let countryToUpdate = countries.find(item=>item._id===activeSpeaker._id); // country to update
            let updateCountry = {};
            if(screen === 'Primary') {
                console.log(countryToUpdate.stats_secondary, timeElapsed);
                updateCountry = {
                    ...countryToUpdate,
                    stats_primary: parseInt(countryToUpdate.stats_primary) + timeElapsed
                };

            } else if (screen === 'Secondary') {
                console.log(countryToUpdate.stats_secondary, timeElapsed);
                updateCountry = {
                    ...countryToUpdate,
                    stats_secondary: parseInt(countryToUpdate.stats_secondary) + timeElapsed
                };
            }
    
            let updatedCountries = countries;
            let index = 0;
            for(let i = 0; i < countries.length; i++) {
                if(countries[i]._id === activeSpeaker._id) {
                    index = i;
                    break;
                }
            }
            updatedCountries.splice(index, 1);
            updatedCountries.push(updateCountry);
            updatedCountries.sort((a, b) => (a.name > b.name) ? 1 : -1);
            
            // console.log(updatedCountries);
            setCountries(updatedCountries);
        }
    }

    function speakingFinished() {
        updateCountriesSession();

        let list = speakersList;
        list.splice(0, 1);
        setActiveSpeaker(speakersList[0]);

        if(list.length === 0) {
            handleStop('skip');
            setShowStart(false);
        }
        saveState(list);
        triggerRefresh();
        setTicking(false);
        setTime(0);
    }

    function speakingPause() {
        setTicking(false);
    }

    function speakingResume() {
        if(timeElapsed < max) {
            setTicking(true);
            startTick();
        }
    }

    function speakingReset() {
        setTicking(false);
        setTime(0);
    }

    function handleStart() {
        setStarted(true);
        setTicking(true);
        speakingStart();
        triggerRefresh();
    }

    function handleStop(skip) {
        if(!(skip === 'skip')) updateCountriesSession();
        setTime(0);
        setStarted(false);
        setTicking(false);
        triggerRefresh();
        setActiveSpeaker([]);
    }
    
    // when screen is changed
    useEffect(() => {

        setTime(0);
        setStarted(false);
        setTicking(false);
        triggerRefresh();
        setActiveSpeaker([]);

        if(screen === 'Primary') {
            if(sessionStorage.getItem('speakersDataPrimary')) {
                setShowStart(speakersList ? ((JSON.parse(sessionStorage.getItem('speakersDataPrimary')).list.length > 0) ? true : false) : false);
                setSpeakersList(JSON.parse(sessionStorage.getItem('speakersDataPrimary')).list);
            }
        }
        if(screen === 'Secondary') {
            if(sessionStorage.getItem('speakersDataSecondary')) {
                setShowStart(speakersList ? ((JSON.parse(sessionStorage.getItem('speakersDataSecondary')).list.length > 0) ? true : false) : false);
                setSpeakersList(JSON.parse(sessionStorage.getItem('speakersDataSecondary')).list);
            }
        }
    }, [screen]);

    return (
        <div className='app-inner'>
            <div className='app-inner-inner speakers'>
                <div className='one-liner'>
                    <h1>Speakers</h1>
                    <div className='speaker-lists'>
                        <div className={`speaker-type ${(screen === 'Primary') ? 'active' : ''}`} onClick={e=>setScreen('Primary')}>Primary</div>
                        <div className={`speaker-type ${(screen === 'Secondary') ? 'active' : ''}`} onClick={e=>setScreen('Secondary')}>Secondary</div>
                        <div className={`speaker-type ${(screen === 'Single') ? 'active' : ''}`} onClick={e=>setScreen('Single')}>Single</div>
                    </div>
                </div>
                <div className='speakers-inner'>
                {(screen === 'Primary' || screen === 'Secondary') ? (
                    <div className='primary-list'>
                        <h2>{(screen === 'Primary') ? 'Primary' : 'Secondary'} Speakers List</h2>
                        <div className='speakers-wrap'>
                            <div className='speakers-container'>
                                {(activeSpeaker) ? ((activeSpeaker.name) ? (
                                    <>
                                        <div className='speaker'>
                                            {activeSpeaker.name}
                                        </div>
                                        <div className='speaker-timer'>
                                            {time}/60
                                        </div>
                                        <div className='speaker-action'>
                                            {(ticking) ? (
                                                <div className='button' onClick={e=>speakingPause()}>
                                                    Pause
                                                </div>
                                            ) : (
                                                <div className='button' onClick={e=>speakingResume()}>
                                                    Resume
                                                </div>
                                            )}
                                            <div className='button' onClick={e=>speakingReset()}>
                                                Reset Time
                                            </div>
                                            <div className='button' onClick={e=>{triggerRefresh(); speakingFinished()}}>
                                                Next
                                            </div>
                                        </div>
                                    </>
                                ) : 'Speaker List Inactive') : 'Speaker List Inactive'}
                            </div>
                            <div className={`speakers-bot ${started ? 'speaking' : ''}`}>
                                <div className={`speakers-add ${started ? 'disabled' : ''}`}>
                                    <h3>Add Speakers</h3>
                                    {displayCountries}
                                </div>
                                <div className='speakers-list'>
                                    <h3>Speaker List</h3>
                                    {displayList}
                                    {(showRemove) ? (
                                        (started) ? '' : (
                                            <div className='remove' onClick={e=>handleRemoveSelected()}>
                                                Remove
                                            </div>
                                        )
                                    ) : ''}
                                </div>
                                <div className='speakers-manage'>
                                    <h3>Manage Speeches</h3>
                                    <div className='manage-field'>
                                        {(showStart) ? (
                                            (started) ? (
                                                <div className='start' onClick={e=>handleStop()}>
                                                    Stop
                                                </div>
                                            ) : (
                                                <div className='start' onClick={e=>handleStart()}>
                                                    Start
                                                </div>
                                            )
                                        ) : ''}
                                        {(showStart) ? (
                                            (started) ? '' : (
                                                <div className='button' onClick={e=>handleRemoveAll()}>
                                                    Clear List
                                                </div>
                                            )
                                        ) : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : ''}
                {(screen === 'Single') ? (
                    <div className='single-list'>
                        <h2>Single Speaker</h2>
                    </div>
                ) : ''}
                {(!screen) ? (
                    'Select a speaker list'
                ) : ''}
                </div>
            </div>
        </div>
    );
}

export default Speakers;